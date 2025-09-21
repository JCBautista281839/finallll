import cv2
import numpy as np

# Load the image
image_path = "/mnt/data/ed75ef85-26ed-4f9b-8807-4b308d0b30de.png"
image = cv2.imread(image_path)

# Convert to grayscale
gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

# Apply thresholding to get binary image
_, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV)

# Find contours to locate the OMR bubbles/boxes
contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

# Draw the contours on the original image
for contour in contours:
    # Calculate bounding box
    x, y, w, h = cv2.boundingRect(contour)
    if w > 20 and h > 20:  # Filter out small contours (noise)
        # Draw the bounding box on the image
        cv2.rectangle(image, (x, y), (x+w, y+h), (0, 255, 0), 2)

# Show the processed image
cv2.imshow("Detected Bubbles", image)
cv2.waitKey(0)
cv2.destroyAllWindows()

# Additional step: Check for filled-in marks (this requires more complex image processing)
