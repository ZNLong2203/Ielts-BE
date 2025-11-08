#!/usr/bin/env python3
"""Pronunciation and Stress Analysis using Parselmouth (Praat)"""

import sys
import json
import os
import numpy as np
import pronouncing

try:
    import parselmouth
    PARSELMOUTH_AVAILABLE = True
except ImportError:
    PARSELMOUTH_AVAILABLE = False
    print("Warning: parselmouth not available. Pronunciation analysis will be limited.", file=sys.stderr)

def clean_word(word):
    """Remove punctuation from word"""
    return word.lower().replace('.', '').replace(',', '').replace('!', '').replace('?', '').replace(';', '').replace(':', '').replace('(', '').replace(')', '').replace('"', '').replace("'", '').strip()

def extract_stress_pattern(pronunciation):
    """Extract stress pattern from CMU pronunciation. Format: "K AE1 T" where 1=primary stress, 2=secondary, 0=unstressed"""
    if not pronunciation:
        return []
    
    parts = pronunciation.split()
    stress_pattern = []
    
    for part in parts:
        if part[-1].isdigit():
            stress = int(part[-1])
            stress_pattern.append(stress)
        else:
            stress_pattern.append(0)
    
    return stress_pattern

def estimate_syllables(word):
    """Estimate syllable count using vowel counting"""
    word = word.lower()
    if len(word) <= 3:
        return 1
    
    matches = [c for c in word if c in 'aeiouy']
    return max(1, len(matches))

def detect_stress_from_prosody(pitch_values, intensity_values, num_syllables):
    """Detect stress pattern from prosodic features. Higher pitch + higher intensity = stressed syllable"""
    if len(pitch_values) == 0 or len(intensity_values) == 0 or num_syllables == 0:
        return [0] * num_syllables
    
    valid_pitch = pitch_values[(pitch_values > 0) & ~np.isnan(pitch_values)]
    valid_intensity = intensity_values[~np.isnan(intensity_values)]
    
    if len(valid_pitch) == 0 or len(valid_intensity) == 0:
        return [0] * num_syllables
    
    pitch_mean = np.mean(valid_pitch)
    pitch_std = np.std(valid_pitch) if len(valid_pitch) > 1 else pitch_mean * 0.1
    intensity_mean = np.mean(valid_intensity)
    intensity_std = np.std(valid_intensity) if len(valid_intensity) > 1 else intensity_mean * 0.1
    
    pitch_threshold = pitch_mean + (0.15 * pitch_std) if pitch_std > 0 else pitch_mean * 1.05
    intensity_threshold = intensity_mean + (0.15 * intensity_std) if intensity_std > 0 else intensity_mean * 1.05
    
    segment_size = max(1, len(pitch_values) // num_syllables) if num_syllables > 0 else len(pitch_values)
    detected_stress = []
    syllable_scores = []
    
    for i in range(num_syllables):
        start_idx = i * segment_size
        end_idx = min((i + 1) * segment_size, len(pitch_values))
        
        if start_idx >= len(pitch_values):
            detected_stress.append(0)
            syllable_scores.append(0.0)
            continue
        
        segment_pitch = pitch_values[start_idx:end_idx]
        segment_intensity = intensity_values[start_idx:end_idx] if start_idx < len(intensity_values) else []
        
        segment_pitch_valid = segment_pitch[(segment_pitch > 0) & ~np.isnan(segment_pitch)]
        segment_intensity_valid = segment_intensity[~np.isnan(segment_intensity)] if len(segment_intensity) > 0 else []
        
        if len(segment_pitch_valid) > 0 and len(segment_intensity_valid) > 0:
            avg_pitch = np.mean(segment_pitch_valid)
            avg_intensity = np.mean(segment_intensity_valid)
            
            pitch_score = (avg_pitch - pitch_mean) / pitch_std if pitch_std > 0 else 0
            intensity_score = (avg_intensity - intensity_mean) / intensity_std if intensity_std > 0 else 0
            
            combined_score = pitch_score + intensity_score
            syllable_scores.append(combined_score)
            
            is_stressed = avg_pitch > pitch_threshold or avg_intensity > intensity_threshold
            detected_stress.append(1 if is_stressed else 0)
        else:
            detected_stress.append(0)
            syllable_scores.append(0.0)
    
    if sum(detected_stress) == 0 and num_syllables > 0 and len(syllable_scores) > 0:
        max_idx = int(np.argmax(syllable_scores))
        detected_stress[max_idx] = 1
    
    return detected_stress

def compare_stress_patterns(expected, actual):
    """Compare expected and actual stress patterns. Returns: match percentage (0-100)"""
    if len(expected) == 0 or len(actual) == 0:
        return 0
    
    min_len = min(len(expected), len(actual))
    expected = expected[:min_len]
    actual = actual[:min_len]
    
    matches = sum(1 for e, a in zip(expected, actual) if e == 1 and a == 1)
    expected_stressed = sum(1 for e in expected if e == 1)
    
    if expected_stressed == 0:
        return 100 if sum(actual) == 0 else 0
    
    return (matches / expected_stressed) * 100

def analyze_pronunciation_text_only(transcription):
    """Fallback function: analyze pronunciation from text only (when parselmouth is not available)"""
    words = [clean_word(w) for w in transcription.split() if clean_word(w)]
    word_analyses = []
    
    for word in words:
        pronunciation = pronouncing.phones_for_word(word)
        pronunciation = pronunciation[0] if pronunciation else None
        
        if pronunciation:
            expected_stress = extract_stress_pattern(pronunciation)
            phonemes = [p.replace('0', '').replace('1', '').replace('2', '') for p in pronunciation.split()]
            syllable_count = len(expected_stress)
        else:
            syllable_count = estimate_syllables(word)
            expected_stress = [1] + [0] * (syllable_count - 1) if syllable_count > 0 else [0]
            phonemes = []
        
        word_analyses.append({
            'word': word,
            'expectedStress': expected_stress,
            'actualStress': expected_stress,
            'phonemes': phonemes,
            'syllableCount': syllable_count,
            'stressMatch': 100.0,
            'avgPitch': 0.0,
            'avgIntensity': 0.0
        })
    
    multi_syllable_words = [w for w in word_analyses if w['syllableCount'] > 1]
    if len(multi_syllable_words) > 0:
        avg_syllables = sum(w['syllableCount'] for w in multi_syllable_words) / len(multi_syllable_words)
        stress_pattern_match = max(60.0, 70.0 - (avg_syllables - 2) * 5)
    else:
        stress_pattern_match = 70.0
    
    base_score = stress_pattern_match
    complex_words = [w for w in word_analyses if w['syllableCount'] >= 3]
    if len(complex_words) > len(word_analyses) * 0.3:
        base_score -= 5
    
    pronunciation_score = max(50.0, min(100.0, base_score))
    
    return {
        'transcription': transcription,
        'words': word_analyses,
        'metrics': {
            'stressPatternMatch': stress_pattern_match,
            'audioDuration': 0
        },
        'stressFeedback': ['Audio analysis not available. Install parselmouth for real pronunciation analysis.'],
        'pronunciationScore': pronunciation_score,
        'detailedFeedback': f'Text-based analysis only (estimated score: {pronunciation_score:.1f}%). Install parselmouth for accurate audio-based pronunciation scoring.'
    }

def analyze_pronunciation(audio_path, transcription):
    """Main function to analyze pronunciation and stress from audio"""
    try:
        if not PARSELMOUTH_AVAILABLE:
            return analyze_pronunciation_text_only(transcription)
        
        sound = parselmouth.Sound(audio_path)
        pitch = sound.to_pitch()
        intensity = sound.to_intensity()
        
        pitch_values = pitch.selected_array['frequency']
        intensity_values = intensity.values[0]
        
        words = [clean_word(w) for w in transcription.split() if clean_word(w)]
        word_analyses = []
        total_stress_match = 0
        words_with_stress = 0
        
        audio_duration = sound.duration
        word_duration = audio_duration / len(words) if len(words) > 0 else 0
        
        for i, word in enumerate(words):
            pronunciation = pronouncing.phones_for_word(word)
            pronunciation = pronunciation[0] if pronunciation else None
            
            if pronunciation:
                expected_stress = extract_stress_pattern(pronunciation)
                phonemes = [p.replace('0', '').replace('1', '').replace('2', '') for p in pronunciation.split()]
                syllable_count = len(expected_stress)
            else:
                syllable_count = estimate_syllables(word)
                expected_stress = [1] + [0] * (syllable_count - 1) if syllable_count > 0 else [0]
                phonemes = []
            
            start_time = i * word_duration
            end_time = (i + 1) * word_duration
            
            pitch_segment = pitch_values[
                (pitch.xs() >= start_time) & (pitch.xs() <= end_time)
            ] if len(pitch_values) > 0 else np.array([])
            
            intensity_segment = intensity.values[0][
                (intensity.xs() >= start_time) & (intensity.xs() <= end_time)
            ] if len(intensity_values) > 0 else np.array([])
            
            actual_stress = detect_stress_from_prosody(
                pitch_segment,
                intensity_segment,
                syllable_count
            )
            
            stress_match = compare_stress_patterns(expected_stress, actual_stress)
            
            if syllable_count > 1:
                total_stress_match += stress_match
                words_with_stress += 1
            
            valid_pitch = pitch_segment[(pitch_segment > 0) & ~np.isnan(pitch_segment)]
            valid_intensity = intensity_segment[~np.isnan(intensity_segment)] if len(intensity_segment) > 0 else np.array([])
            
            avg_pitch = float(np.mean(valid_pitch)) if len(valid_pitch) > 0 else 0.0
            avg_intensity = float(np.mean(valid_intensity)) if len(valid_intensity) > 0 else 0.0
            
            word_analyses.append({
                'word': word,
                'expectedStress': expected_stress,
                'actualStress': actual_stress.tolist() if isinstance(actual_stress, np.ndarray) else actual_stress,
                'phonemes': phonemes,
                'syllableCount': syllable_count,
                'stressMatch': float(stress_match),
                'avgPitch': avg_pitch,
                'avgIntensity': avg_intensity
            })
        
        stress_pattern_match = (total_stress_match / words_with_stress) if words_with_stress > 0 else 0
        stress_pattern_match = min(100, max(0, stress_pattern_match))
        
        base_score = stress_pattern_match * 0.4
        
        pitch_variations = [w['avgPitch'] for w in word_analyses if w['avgPitch'] > 0]
        if len(pitch_variations) > 1:
            pitch_std = np.std(pitch_variations) if len(pitch_variations) > 1 else 0
            pitch_mean = np.mean(pitch_variations)
            cv = (pitch_std / pitch_mean * 100) if pitch_mean > 0 else 0
            clarity_score = min(100, max(50, 50 + cv * 0.5))
        else:
            clarity_score = 60
        base_score += clarity_score * 0.3
        
        intensity_variations = [w['avgIntensity'] for w in word_analyses if w['avgIntensity'] > 0]
        if len(intensity_variations) > 1:
            intensity_std = np.std(intensity_variations) if len(intensity_variations) > 1 else 0
            intensity_mean = np.mean(intensity_variations)
            cv = (intensity_std / intensity_mean * 100) if intensity_mean > 0 else 0
            rhythm_score = min(100, max(50, 50 + cv * 0.5))
        else:
            rhythm_score = 60
        base_score += rhythm_score * 0.2
        
        multi_syllable_words = [w for w in word_analyses if w['syllableCount'] > 1]
        if len(multi_syllable_words) > 0:
            word_accuracy = np.mean([w['stressMatch'] for w in multi_syllable_words])
        else:
            word_accuracy = 70
        base_score += word_accuracy * 0.1
        
        pronunciation_score = min(100, max(0, base_score))
        
        stress_feedback = []
        if stress_pattern_match < 70:
            stress_feedback.append(f"Stress pattern accuracy is {stress_pattern_match:.1f}%. Focus on word stress in multi-syllable words.")
        elif stress_pattern_match < 80:
            stress_feedback.append(f"Stress patterns are acceptable ({stress_pattern_match:.1f}%) but can be improved.")
        else:
            stress_feedback.append(f"Good stress patterns ({stress_pattern_match:.1f}%).")
        
        multi_syllable_words = [w for w in word_analyses if w['syllableCount'] > 1]
        if len(multi_syllable_words) > 0:
            stress_feedback.append(f"Analyzed {len(multi_syllable_words)} multi-syllable words for stress patterns.")
        
        if clarity_score < 60:
            stress_feedback.append("Work on speech clarity and pitch variation.")
        if rhythm_score < 60:
            stress_feedback.append("Improve rhythm and intonation patterns.")
        
        detailed_feedback = f"Pronunciation analysis completed. Overall score: {pronunciation_score:.1f}%. "
        detailed_feedback += f"Stress pattern match: {stress_pattern_match:.1f}%, Clarity: {clarity_score:.1f}%, Rhythm: {rhythm_score:.1f}%. "
        if pronunciation_score >= 80:
            detailed_feedback += "Excellent pronunciation with clear stress patterns and good rhythm."
        elif pronunciation_score >= 70:
            detailed_feedback += "Good pronunciation overall. Continue practicing stress patterns and intonation."
        elif pronunciation_score >= 60:
            detailed_feedback += "Pronunciation needs improvement. Focus on word stress, clarity, and rhythm."
        else:
            detailed_feedback += "Significant improvement needed. Practice stress patterns, clarity, and intonation systematically."
        
        return {
            'transcription': transcription,
            'words': word_analyses,
            'metrics': {
                'stressPatternMatch': float(stress_pattern_match),
                'audioDuration': float(audio_duration)
            },
            'stressFeedback': stress_feedback,
            'pronunciationScore': float(pronunciation_score),
            'detailedFeedback': detailed_feedback
        }
        
    except Exception as e:
        return {
            'error': str(e),
            'transcription': transcription,
            'words': [],
            'metrics': {
                'stressPatternMatch': 0,
                'audioDuration': 0
            },
            'stressFeedback': ['Error analyzing pronunciation'],
            'pronunciationScore': 0,
            'detailedFeedback': f'Error: {str(e)}'
        }

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(json.dumps({
            'error': 'Usage: python pronunciation_analyzer.py <audio_path> <transcription>'
        }))
        sys.exit(1)
    
    audio_path = sys.argv[1]
    transcription = sys.argv[2]
    
    if not os.path.exists(audio_path):
        print(json.dumps({
            'error': f'Audio file not found: {audio_path}'
        }))
        sys.exit(1)
    
    result = analyze_pronunciation(audio_path, transcription)
    print(json.dumps(result, indent=2))

