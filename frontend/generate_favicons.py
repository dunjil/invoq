from PIL import Image
import os

input_path = "/home/duna/Desktop/invoq/frontend/public/images/invoq-logo-transparent.png"
output_dir = "/home/duna/Desktop/invoq/frontend/src/app"

def create_icons():
    img = Image.open(input_path).convert("RGBA")
    
    # 1. favicon.ico (16x16, 32x32, 48x48)
    # create a square version for the favicon (the logo might be wide, we need to padding)
    size = max(img.width, img.height)
    square_bg = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    x = (size - img.width) // 2
    y = (size - img.height) // 2
    square_bg.paste(img, (x, y), img)
    
    icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
    square_bg.save(os.path.join(output_dir, "favicon.ico"), format="ICO", sizes=icon_sizes)
    print("Created favicon.ico")
    
    # 2. apple-icon.png (180x180) - usually solid bg
    apple_bg = Image.new("RGBA", (size, size), (26, 26, 24, 255)) # Dark bg: #1A1A18
    # Add some padding to the logo
    padded_size = int(size * 0.8)
    img_resized = img.resize((padded_size, int(padded_size * img.height / img.width)), Image.Resampling.LANCZOS)
    
    x2 = (size - img_resized.width) // 2
    y2 = (size - img_resized.height) // 2
    apple_bg.paste(img_resized, (x2, y2), img_resized)
    
    apple_final = apple_bg.resize((180, 180), Image.Resampling.LANCZOS)
    apple_final.convert("RGB").save(os.path.join(output_dir, "apple-icon.png"), format="PNG")
    print("Created apple-icon.png")
    
    # 3. icon.png (192x192) - transparent
    icon_final = square_bg.resize((192, 192), Image.Resampling.LANCZOS)
    icon_final.save(os.path.join(output_dir, "icon.png"), format="PNG")
    print("Created icon.png")
    
    # 4. opengraph-image.png (1200x630)
    og_bg = Image.new("RGBA", (1200, 630), (26, 26, 24, 255)) # #1A1A18
    og_logo_width = 800
    og_logo_height = int(og_logo_width * img.height / img.width)
    img_og = img.resize((og_logo_width, og_logo_height), Image.Resampling.LANCZOS)
    
    og_x = (1200 - og_logo_width) // 2
    og_y = (630 - og_logo_height) // 2
    og_bg.paste(img_og, (og_x, og_y), img_og)
    og_bg.convert("RGB").save(os.path.join(output_dir, "opengraph-image.png"), format="PNG")
    og_bg.convert("RGB").save(os.path.join(output_dir, "twitter-image.png"), format="PNG")
    print("Created opengraph-image.png and twitter-image.png")

if __name__ == "__main__":
    create_icons()
