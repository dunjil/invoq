import sys
from PIL import Image

def make_transparent(input_path, output_path, tolerance=240):
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()
    
    newData = []
    for item in datas:
        # If pixel is close to white, make it transparent
        if item[0] > tolerance and item[1] > tolerance and item[2] > tolerance:
            newData.append((255, 255, 255, 0))
        elif item[3] > 0: # not already transparent
            # Let's apply slight anti-aliasing for edges by fading white
            if item[0] > 200 and item[1] > 200 and item[2] > 200:
                alpha = int(255 - ((item[0] + item[1] + item[2]) / 3))
                newData.append((item[0], item[1], item[2], max(0, min(255, alpha * 2))))
            else:
                newData.append(item)
        else:
            newData.append(item)
            
    img.putdata(newData)
    
    # Auto-crop the transparent regions
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)

    img.save(output_path, "PNG")
    print(f"Saved transparent cropped logo to {output_path}")

input_img = "/home/duna/.gemini/antigravity/brain/eca9080f-d1b5-44c7-823a-d04eda54826b/invoq_logo_text_raw_1772482067848.png"
output_img = "/home/duna/Desktop/invoq/frontend/public/images/invoq-logo-transparent.png"
make_transparent(input_img, output_img)
