#!/bin/bash

# Generate PNG icons from SVG
# Requires ImageMagick or similar tool

# Using ImageMagick (install with: brew install imagemagick)
if command -v convert &> /dev/null; then
    echo "Generating icons with ImageMagick..."
    convert -background none icon.svg -resize 16x16 icon16.png
    convert -background none icon.svg -resize 48x48 icon48.png
    convert -background none icon.svg -resize 128x128 icon128.png
    echo "Icons generated successfully!"
elif command -v rsvg-convert &> /dev/null; then
    # Alternative: using librsvg (install with: brew install librsvg)
    echo "Generating icons with librsvg..."
    rsvg-convert -w 16 -h 16 icon.svg -o icon16.png
    rsvg-convert -w 48 -h 48 icon.svg -o icon48.png
    rsvg-convert -w 128 -h 128 icon.svg -o icon128.png
    echo "Icons generated successfully!"
else
    echo "Error: Neither ImageMagick nor librsvg found."
    echo "Please install one of them:"
    echo "  brew install imagemagick"
    echo "  or"
    echo "  brew install librsvg"
    exit 1
fi
