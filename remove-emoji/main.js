// remove-emoji/main.js
const fs = require("fs");
const path = require("path");
const { glob } = require("glob");
const readline = require("readline");

/**
 * If you want to remove manually with VSCode, follow these steps:
 * 1. Open VSCode in the Backend directory.
 * 2. Press Ctrl+Shift+F (or Cmd+Shift+F on Mac) to open the global search.
 * 3. Enable "Use Regular Expression" (the .* icon).
 * 4. Enter the following regex to find emojis:
 *    [\p{Emoji_Presentation}\p{Extended_Pictographic}]
 * 5. Review the results and replace them with an empty string to remove emojis.
 * 6. Be cautious and review changes before saving files.
 */

/**
 * Comprehensive emoji regex using Unicode properties
 * Requires Node.js 10+
 *
 * Matches ALL emojis including:
 * - Standard emojis: 🚀 📝 🔔
 * - Symbols: ✅ ❌ ⚠️
 * - Arrows: → ← ↑ ↓
 * - Checkmarks: ✓ ✗
 * - And many more...
 */
const EMOJI_REGEX = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu;

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  // Base directory (Backend folder)
  baseDir: path.join(__dirname, "../Backend"),

  // Directories to search (relative to Backend)
  include: ["src/**/*.ts", "src/**/*.js"],

  // Directories to ignore
  exclude: [
    "node_modules/**",
    "dist/**",
    "build/**",
    "coverage/**",
    ".git/**",
    "prisma/migrations/**",
  ],
};

/**
 * Create readline interface for user input
 */
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Ask user for input with default value
 * Enhanced to handle multi-line paste and trim input
 */
function askQuestion(rl, question, defaultValue) {
  return new Promise((resolve) => {
    rl.question(`${question} [${defaultValue}]: `, (answer) => {
      // Clean input - remove newlines, carriage returns, extra spaces
      const cleaned = answer.trim().replace(/[\r\n]+/g, "");
      resolve(cleaned || defaultValue);
    });
  });
}

/**
 * Normalize path for cross-platform compatibility
 * Converts Windows backslashes to forward slashes
 * Handles duplicate path issues from copy-paste
 */
function normalizePath(inputPath) {
  // Trim whitespace first
  let normalized = inputPath.trim();

  // Fix duplicate path issue (Windows paste bug)
  // Example: D:\path\toD:\path\to → D:\path\to
  const duplicateMatch = normalized.match(
    /^([A-Z]:[\\\/][^:]+)([A-Z]:[\\\/].+)$/i
  );
  if (duplicateMatch) {
    normalized = duplicateMatch[1];
    console.log(`⚠️  Fixed duplicate path, using: ${normalized}`);
  }

  // Replace backslashes with forward slashes
  normalized = normalized.replace(/\\/g, "/");

  // Handle Windows absolute paths (C:/... or C:\...)
  if (/^[a-zA-Z]:/.test(normalized)) {
    return path.resolve(normalized);
  }

  // Handle tilde expansion for Unix-like systems
  if (normalized.startsWith("~/")) {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    normalized = path.join(homeDir, normalized.slice(2));
  }

  // Handle relative paths
  if (!path.isAbsolute(normalized)) {
    return path.resolve(normalized);
  }

  return path.resolve(normalized);
}

/**
 * Validate if directory exists
 */
function validateDirectory(dirPath) {
  try {
    const stats = fs.statSync(dirPath);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
}

/**
 * Get configuration from user input
 */
async function getConfiguration() {
  const rl = createReadlineInterface();

  console.log("=".repeat(60));
  console.log("Remove Emoji Script Configuration");
  console.log("=".repeat(60));
  console.log("\nPress Enter to use default values");
  console.log(
    "💡 Tip: Paste path and press Enter (avoid double-click select)\n"
  );

  // Ask for base directory
  let baseDir;
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    const defaultBaseDir = DEFAULT_CONFIG.baseDir;
    const input = await askQuestion(
      rl,
      "Enter base directory path",
      defaultBaseDir
    );

    baseDir = normalizePath(input);

    if (validateDirectory(baseDir)) {
      console.log(`✓ Directory found: ${baseDir}\n`);
      break;
    } else {
      attempts++;
      console.log(`✗ Directory not found: ${baseDir}`);

      if (attempts < maxAttempts) {
        console.log(`Please try again (${attempts}/${maxAttempts} attempts)\n`);

        // Show examples on second attempt
        if (attempts === 1) {
          console.log("Examples:");
          if (process.platform === "win32") {
            console.log("  D:\\projects\\Ielts-FE");
            console.log("  D:/projects/Ielts-FE");
          } else {
            console.log("  /home/username/projects/Ielts-FE");
            console.log("  ~/projects/Ielts-FE");
          }
          console.log("  ../Ielts-FE (relative path)\n");
        }
      } else {
        console.log("\nToo many failed attempts. Using default directory.\n");
        baseDir = DEFAULT_CONFIG.baseDir;
        break;
      }
    }
  }

  // Ask for file patterns
  const includeInput = await askQuestion(
    rl,
    "Enter file patterns to include (comma-separated)",
    DEFAULT_CONFIG.include.join(", ")
  );
  const include = includeInput.split(",").map((p) => p.trim());

  // Ask for exclude patterns
  const excludeInput = await askQuestion(
    rl,
    "Enter patterns to exclude (comma-separated)",
    DEFAULT_CONFIG.exclude.join(", ")
  );
  const exclude = excludeInput.split(",").map((p) => p.trim());

  // Ask for dry run
  const dryRunInput = await askQuestion(rl, "Dry run mode? (y/n)", "y");
  const dryRun = dryRunInput.toLowerCase() === "y";

  // Ask for verbose
  const verboseInput = await askQuestion(rl, "Verbose output? (y/n)", "n");
  const verbose = verboseInput.toLowerCase() === "y";

  rl.close();

  return {
    baseDir,
    include,
    exclude,
    dryRun,
    verbose,
  };
}

/**
 * Main function
 */
async function removeEmojis() {
  try {
    // Get configuration from user or command line args
    let config;

    // Check if running with command line args
    const hasArgs =
      process.argv.includes("--dry-run") ||
      process.argv.includes("--verbose") ||
      process.argv.includes("--no-prompt");

    if (hasArgs || process.argv.includes("--no-prompt")) {
      // Use default config with command line overrides
      config = {
        ...DEFAULT_CONFIG,
        dryRun: process.argv.includes("--dry-run"),
        verbose: process.argv.includes("--verbose"),
      };

      console.log("Using default configuration (--no-prompt mode)\n");
    } else {
      // Interactive mode - ask user for configuration
      config = await getConfiguration();
    }

    console.log("\n" + "=".repeat(60));
    console.log("Configuration Summary:");
    console.log("=".repeat(60));
    console.log(`Base directory: ${config.baseDir}`);
    console.log(`Include patterns: ${config.include.join(", ")}`);
    console.log(`Exclude patterns: ${config.exclude.join(", ")}`);
    console.log(`Dry run: ${config.dryRun ? "Yes" : "No"}`);
    console.log(`Verbose: ${config.verbose ? "Yes" : "No"}`);
    console.log("=".repeat(60) + "\n");

    // Confirm before proceeding
    if (!config.dryRun) {
      const rl = createReadlineInterface();
      const confirm = await askQuestion(
        rl,
        "⚠️  This will modify files. Continue? (y/n)",
        "n"
      );
      rl.close();

      if (confirm.toLowerCase() !== "y") {
        console.log("\nOperation cancelled by user.\n");
        process.exit(0);
      }
    }

    console.log("\nSearching for files with emojis...\n");

    // Change to base directory
    const originalCwd = process.cwd();
    process.chdir(config.baseDir);

    // Find all matching files
    const files = await glob(config.include, {
      ignore: config.exclude,
      absolute: true,
    });

    console.log(`Found ${files.length} files to process\n`);

    if (files.length === 0) {
      console.log("No files found matching the patterns.\n");
      process.chdir(originalCwd);
      return;
    }

    let filesModified = 0;
    let totalEmojisRemoved = 0;
    const modifiedFiles = [];

    // Process each file
    for (const filePath of files) {
      const result = await processFile(filePath, config.dryRun);

      if (result.modified) {
        filesModified++;
        totalEmojisRemoved += result.emojisRemoved;
        modifiedFiles.push({
          path: filePath,
          count: result.emojisRemoved,
        });

        if (config.verbose) {
          console.log(
            `✓ ${path.relative(config.baseDir, filePath)} - Removed ${
              result.emojisRemoved
            } emoji(s)`
          );
        }
      }
    }

    // Restore original directory
    process.chdir(originalCwd);

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("Summary:");
    console.log("=".repeat(60));
    console.log(`Total files scanned: ${files.length}`);
    console.log(`Files modified: ${filesModified}`);
    console.log(`Total emojis removed: ${totalEmojisRemoved}`);

    if (config.dryRun) {
      console.log("\n⚠️  DRY RUN MODE - No files were actually modified");
      console.log("Run without dry run to apply changes");
    }

    if (modifiedFiles.length > 0) {
      console.log("\nModified files:");
      const maxDisplay = config.verbose ? modifiedFiles.length : 20;
      modifiedFiles
        .slice(0, maxDisplay)
        .forEach(({ path: filePath, count }) => {
          console.log(
            `  - ${path.relative(config.baseDir, filePath)} (${count} emojis)`
          );
        });

      if (modifiedFiles.length > maxDisplay) {
        console.log(
          `  ... and ${modifiedFiles.length - maxDisplay} more files`
        );
      }
    }

    console.log("\nDone!\n");
  } catch (error) {
    console.error("\nError:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Process a single file
 */
async function processFile(filePath, dryRun) {
  try {
    const originalContent = fs.readFileSync(filePath, "utf8");

    // Count emojis before removal
    const emojiMatches = originalContent.match(EMOJI_REGEX);
    const emojisRemoved = emojiMatches ? emojiMatches.length : 0;

    if (emojisRemoved === 0) {
      return { modified: false, emojisRemoved: 0 };
    }

    // Remove emojis
    const newContent = originalContent.replace(EMOJI_REGEX, "");

    // Write file if not dry run
    if (!dryRun) {
      fs.writeFileSync(filePath, newContent, "utf8");
    }

    return { modified: true, emojisRemoved };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return { modified: false, emojisRemoved: 0 };
  }
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
Remove Emoji Script
===================

Usage: node remove-emoji/main.js [options]

Options:
  --no-prompt   Skip interactive prompts, use default configuration
  --dry-run     Preview changes without modifying files
  --verbose     Show detailed output for each file
  --help        Show this help message

Examples:
  # Interactive mode (asks for configuration)
  node remove-emoji/main.js

  # Quick mode with defaults
  node remove-emoji/main.js --no-prompt --dry-run

  # Verbose dry run
  node remove-emoji/main.js --no-prompt --dry-run --verbose

  # Execute with defaults (no dry run)
  node remove-emoji/main.js --no-prompt

Supported Path Formats:
  Windows:   D:\\documents\\code\\git\\Ielts-FE
             D:/documents/code/git/Ielts-FE
  Linux/Mac: /home/username/projects/Ielts-FE
             ~/projects/Ielts-FE
  Relative:  ../Ielts-FE
             ./src

When prompted for paths, press Enter to use the default value shown in brackets.
Tips:
  - Paste the full path and press Enter
  - Avoid selecting text with double-click (may cause duplicate paste)
  - Use forward slashes (/) or backslashes (\\) - both work
  `);
}

// Handle --help flag
if (process.argv.includes("--help")) {
  showHelp();
  process.exit(0);
}

// Run the script
removeEmojis();
