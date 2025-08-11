#!/usr/bin/env python3
"""
Script to remove grey background from laya.png and create a version with transparency
"""

from PIL import Image
import os

def remove_grey_background(input_path, output_path, grey_threshold=50):
    """
    Remove grey background from an image and save as PNG with transparency
    
    Args:
        input_path (str): Path to input image
        output_path (str): Path to output image
        grey_threshold (int): Threshold for grey detection (0-255)
    """
    
    # Open the image
    img = Image.open(input_path)
    
    # Convert to RGBA if not already
    img = img.convert("RGBA")
    
    # Get image data
    data = img.getdata()
    
    # Create new image data with transparency
    new_data = []
    for item in data:
        # item is (R, G, B, A) tuple
        r, g, b, a = item
        
        # Check if pixel is grey (R, G, B values are close to each other and within grey range)
        # Also check for light grey/off-white colors
        avg_color = (r + g + b) / 3
        color_variance = max(abs(r - avg_color), abs(g - avg_color), abs(b - avg_color))
        
        # If the color is greyish (low variance between RGB) and light enough
        if (color_variance < 30 and avg_color > 255 - grey_threshold) or \
           (r > 255 - grey_threshold and g > 255 - grey_threshold and b > 255 - grey_threshold):
            # Make transparent
            new_data.append((255, 255, 255, 0))
        else:
            # Keep original
            new_data.append(item)
    
    # Update image data
    img.putdata(new_data)
    
    # Save as PNG with transparency
    img.save(output_path, "PNG")
    print(f"Grey background removed! Saved to: {output_path}")

def main():
    # Define paths
    input_path = "/Users/prashant/Documents/Application directory/KH/public/laya.png"
    output_path = "/Users/prashant/Documents/Application directory/KH/public/laya_transparent.png"
    
    # Check if input file exists
    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        return
    
    print(f"Processing: {input_path}")
    
    # Remove grey background with standard threshold
    remove_grey_background(input_path, output_path, grey_threshold=50)
    
    # Also create versions with different thresholds in case the first one doesn't work well
    conservative_path = "/Users/prashant/Documents/Application directory/KH/public/laya_conservative.png"
    remove_grey_background(input_path, conservative_path, grey_threshold=30)
    print(f"Also created conservative version: {conservative_path}")
    
    aggressive_path = "/Users/prashant/Documents/Application directory/KH/public/laya_aggressive.png"
    remove_grey_background(input_path, aggressive_path, grey_threshold=80)
    print(f"Also created aggressive version: {aggressive_path}")

if __name__ == "__main__":
    main()
