// remove-emoji/main.js
const fs = require("fs");
const path = require("path");
const { glob } = require("glob");

/**
 * If you want to remove manually with VSCode, follow these steps:
 * 1. Open VSCode in the Backend directory.
 * 2. Press Ctrl+Shift+F (or Cmd+Shift+F on Mac) to open the global search.
 * 3. Enable "Use Regular Expression" (the .* icon).
 * 4. Enter the following regex to find emojis:
 *    [\p{Emoji_Presentation}\p{Extended_Pictographic}]
 * or:
 * [\u{1F000}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}]
 * 5. Review the results and replace them with an empty string to remove emojis.
 * 6. Be cautious and review changes before saving files.
 */

/**
 * Comprehensive emoji regex using Unicode properties
 * Requires Node.js 10+
 */
const EMOJI_REGEX = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu;

/**
 * Configuration
 */
const CONFIG = {
  // Base directory (Backend folder)
  baseDir: path.join(__dirname, "../Backend"), // ← Trỏ lên Backend

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

  // Dry run mode
  dryRun: process.argv.includes("--dry-run"),

  // Verbose output
  verbose: process.argv.includes("--verbose"),
};

/**
 * Main function
 */
async function removeEmojis() {
  console.log("Searching for files with emojis...\n");
  console.log(`Base directory: ${CONFIG.baseDir}\n`);

  try {
    // Change to Backend directory
    const originalCwd = process.cwd();
    process.chdir(CONFIG.baseDir);

    // Find all matching files
    const files = await glob(CONFIG.include, {
      ignore: CONFIG.exclude,
      absolute: true,
    });

    console.log(`Found ${files.length} files to process\n`);

    let filesModified = 0;
    let totalEmojisRemoved = 0;
    const modifiedFiles = [];

    // Process each file
    for (const filePath of files) {
      const result = await processFile(filePath);

      if (result.modified) {
        filesModified++;
        totalEmojisRemoved += result.emojisRemoved;
        modifiedFiles.push({
          path: filePath,
          count: result.emojisRemoved,
        });

        if (CONFIG.verbose) {
          console.log(
            `✅ ${path.relative(CONFIG.baseDir, filePath)} - Removed ${
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

    if (CONFIG.dryRun) {
      console.log("\n⚠️  DRY RUN MODE - No files were actually modified");
      console.log("Run without --dry-run to apply changes");
    }

    if (modifiedFiles.length > 0) {
      console.log("\nModified files:");
      modifiedFiles.forEach(({ path: filePath, count }) => {
        console.log(
          `  - ${path.relative(CONFIG.baseDir, filePath)} (${count} emojis)`
        );
      });
    }

    console.log("\nDone!\n");
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

/**
 * Process a single file
 */
async function processFile(filePath) {
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
    if (!CONFIG.dryRun) {
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
Usage: node remove-emoji/main.js [options]

Options:
  --dry-run     Preview changes without modifying files
  --verbose     Show detailed output for each file
  --help        Show this help message

Examples:
  node remove-emoji/main.js --dry-run
  node remove-emoji/main.js --verbose
  node remove-emoji/main.js --dry-run --verbose
  `);
}

// Handle --help flag
if (process.argv.includes("--help")) {
  showHelp();
  process.exit(0);
}

// Run the script
removeEmojis();
