#!/usr/bin/env python3
"""
Simple script to minify SVG and split into start/end parts
Processes line by line for safety
"""

from pathlib import Path

def minify_content(content):
    """Minify content by processing line by line"""
    
    lines = content.split('\n')
    minified_lines = []
    
    for line in lines:
        # Skip empty lines
        if not line.strip():
            continue
            
        # Skip HTML comments (<!-- -->)
        if line.strip().startswith('<!--') and line.strip().endswith('-->'):
            continue
            
        # Skip lines that are just JavaScript comments (// ...)
        stripped = line.strip()
        if stripped.startswith('//'):
            continue
            
        # Remove JavaScript single-line comments (// ...) from anywhere on the line
        # But be careful not to remove // in URLs like http://
        comment_pos = -1
        for i in range(len(stripped) - 1):
            if stripped[i:i+2] == '//':
                # Check if it's not part of http://
                if i > 0 and stripped[i-1] != ':':
                    comment_pos = i
                    break
        
        if comment_pos != -1:
            stripped = stripped[:comment_pos].rstrip()
            
        # Skip if line is now empty after comment removal
        if not stripped:
            continue
            
        # Keep the original line structure, just trimmed
        minified_lines.append(stripped)
    
    # Join lines without newlines for maximum minification
    return ''.join(minified_lines)

def split_svg(file_path):
    """Split SVG into start and end parts first, then minify each"""
    
    print(f"Processing file: {file_path}")
    
    # Read the file content
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_size = len(content)
    print(f"Original file size: {original_size} characters")
    
    # Find the dynamic content markers
    start_marker = "<!-- Dynamic Content Start -->"
    end_marker = "<!-- Dynamic Content End -->"
    
    start_pos = content.find(start_marker)
    end_pos = content.find(end_marker)
    
    if start_pos == -1 or end_pos == -1:
        print("ERROR: Could not find dynamic content markers!")
        return None, None, None
    
    # Extract the parts (keeping the markers for now)
    start_part = content[:start_pos]
    end_part = content[end_pos + len(end_marker):]
    
    print(f"Split parts:")
    print(f"  Start part length: {len(start_part)} characters")
    print(f"  End part length: {len(end_part)} characters")
    
    # Now minify each part
    print("\nMinifying parts...")
    minified_start = minify_content(start_part)
    minified_end = minify_content(end_part)
    
    # Also minify the full content
    minified_full = minify_content(content)
    
    minified_size = len(minified_full)
    reduction = (minified_size / original_size) * 100
    print(f"Minified full size: {minified_size} characters")
    print(f"Reduction: {reduction:.1f}%")
    
    return minified_start, minified_end, minified_full

def main():
    file_path = Path("assets/paint.full.svg")
    
    if not file_path.exists():
        print(f"Error: File {file_path} not found!")
        return
    
    try:
        # Split first, then minify each part
        start_part, end_part, full_content = split_svg(file_path)
        
        if start_part is None or end_part is None:
            return
        
        # Write the files
        start_file = file_path.parent / "paint.min.start.svg"
        end_file = file_path.parent / "paint.min.end.svg"
        
        with open(start_file, 'w', encoding='utf-8') as f:
            f.write(start_part)
        
        with open(end_file, 'w', encoding='utf-8') as f:
            f.write(end_part)
        
        print(f"\nFiles created:")
        print(f"  Start: {start_file}")
        print(f"  End: {end_file}")
        
        # Also create the minified full version
        minified_file = file_path.parent / "paint.min.svg"
        with open(minified_file, 'w', encoding='utf-8') as f:
            f.write(full_content)
        
        print(f"  Minified: {minified_file}")
        
    except Exception as e:
        print(f"Error processing file: {e}")

if __name__ == "__main__":
    main()