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
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(output_path, "PNG")
    print(f"Saved transparent logo to {output_path}")

input_img = "/home/duna/.gemini/antigravity/brain/eca9080f-d1b5-44c7-823a-d04eda54826b/invoq_logo_raw_1772481997172.png"
output_img = "/home/duna/Desktop/invoq/frontend/public/images/invoq-logo-transparent.png"
make_transparent(input_img, output_img)
