#!/usr/bin/env python3
"""
Script to remove white background from vhi.jpg and convert it to PNG with transparency
"""

from PIL import Image
import os

def remove_white_background(input_path, output_path, threshold=30):
    """
    Remove white background from an image and save as PNG with transparency
    
    Args:
        input_path (str): Path to input image
        output_path (str): Path to output image
        threshold (int): Threshold for white detection (0-255)
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
        # Check if pixel is close to white
        # item is (R, G, B, A) tuple
        if item[0] > 255 - threshold and item[1] > 255 - threshold and item[2] > 255 - threshold:
            # Make transparent
            new_data.append((255, 255, 255, 0))
        else:
            # Keep original
            new_data.append(item)
    
    # Update image data
    img.putdata(new_data)
    
    # Save as PNG with transparency
    img.save(output_path, "PNG")
    print(f"Background removed! Saved to: {output_path}")

def main():
    # Define paths
    input_path = "/Users/prashant/Documents/Application directory/KH/public/vhi.jpg"
    output_path = "/Users/prashant/Documents/Application directory/KH/public/vhi.png"
    
    # Check if input file exists
    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        return
    
    print(f"Processing: {input_path}")
    
    # Remove white background
    remove_white_background(input_path, output_path, threshold=30)
    
    # Also create a backup with a more aggressive threshold in case the first one doesn't work well
    backup_path = "/Users/prashant/Documents/Application directory/KH/public/vhi_aggressive.png"
    remove_white_background(input_path, backup_path, threshold=50)
    print(f"Also created aggressive version: {backup_path}")

if __name__ == "__main__":
    main()
