#!/usr/bin/env python3
"""
tattoo_tools.py

Unified tattoo utility:
- overlay: place a tattoo image on skin/photo
- inpaint: remove an existing tattoo/object using a mask
- replace: inpaint first, then overlay a new tattoo

Dependencies:
    pip install pillow opencv-python

Examples:

1) Overlay a tattoo
    python tattoo_tools.py overlay arm.jpg dragon.png --x 200 --y 450 --width 260 --angle -10 --opacity 0.65 --blend multiply

2) Remove an old tattoo using a mask
    python tattoo_tools.py inpaint arm.jpg mask.png --radius 5 --method telea --output cleaned_skin.png

3) Replace an old tattoo with a new one
    python tattoo_tools.py replace arm.jpg old_tattoo_mask.png new_tattoo.png \
        --x 220 --y 430 --width 250 --angle -8 --opacity 0.62 --blend multiply \
        --radius 5 --method telea --output replaced_tattoo.png
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Tuple

import cv2
import numpy as np
from PIL import Image


def clamp_opacity(opacity: float) -> float:
    return max(0.0, min(1.0, opacity))


def remove_white_background(img: Image.Image, threshold: int = 235) -> Image.Image:
    img = img.convert("RGBA")
    pixels = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = pixels[x, y]
            if r >= threshold and g >= threshold and b >= threshold:
                pixels[x, y] = (r, g, b, 0)
    return img


def resize_tattoo(
    tattoo: Image.Image,
    scale: float | None = None,
    target_width: int | None = None,
) -> Image.Image:
    if target_width is not None:
        if target_width <= 0:
            raise ValueError("--width must be greater than 0")
        ratio = target_width / tattoo.width
        new_size = (target_width, max(1, int(tattoo.height * ratio)))
        return tattoo.resize(new_size, Image.Resampling.LANCZOS)

    if scale is not None:
        if scale <= 0:
            raise ValueError("--scale must be greater than 0")
        new_size = (
            max(1, int(tattoo.width * scale)),
            max(1, int(tattoo.height * scale)),
        )
        return tattoo.resize(new_size, Image.Resampling.LANCZOS)

    return tattoo


def apply_opacity(tattoo: Image.Image, opacity: float) -> Image.Image:
    tattoo = tattoo.convert("RGBA")
    opacity = clamp_opacity(opacity)
    r, g, b, a = tattoo.split()
    a = a.point(lambda p: int(p * opacity))
    tattoo.putalpha(a)
    return tattoo


def normal_blend(base: Image.Image, tattoo: Image.Image, position: Tuple[int, int]) -> Image.Image:
    result = base.copy()
    result.alpha_composite(tattoo, dest=position)
    return result


def multiply_blend(base: Image.Image, tattoo: Image.Image, position: Tuple[int, int]) -> Image.Image:
    base = base.convert("RGBA")
    tattoo = tattoo.convert("RGBA")
    x, y = position
    result = base.copy()

    left = max(0, x)
    top = max(0, y)
    right = min(base.width, x + tattoo.width)
    bottom = min(base.height, y + tattoo.height)

    if right <= left or bottom <= top:
        return result

    base_crop = base.crop((left, top, right, bottom)).convert("RGBA")
    tattoo_left = left - x
    tattoo_top = top - y
    tattoo_right = tattoo_left + (right - left)
    tattoo_bottom = tattoo_top + (bottom - top)
    tattoo_crop = tattoo.crop((tattoo_left, tattoo_top, tattoo_right, tattoo_bottom)).convert("RGBA")

    base_rgb = base_crop.convert("RGB")
    tattoo_rgb = tattoo_crop.convert("RGB")

    multiplied = Image.new("RGB", base_rgb.size)
    base_pixels = base_rgb.load()
    tattoo_pixels = tattoo_rgb.load()
    mult_pixels = multiplied.load()

    for py in range(base_rgb.height):
        for px in range(base_rgb.width):
            br, bg, bb = base_pixels[px, py]
            tr, tg, tb = tattoo_pixels[px, py]
            mult_pixels[px, py] = (
                int(br * tr / 255),
                int(bg * tg / 255),
                int(bb * tb / 255),
            )

    alpha = tattoo_crop.split()[3]
    blended = Image.composite(multiplied.convert("RGBA"), base_crop, alpha)
    result.paste(blended, (left, top), blended)
    return result


def overlay_tattoo(
    base_img_path: str | Path,
    tattoo_img_path: str | Path,
    position: Tuple[int, int],
    opacity: float = 0.65,
    scale: float | None = None,
    width: int | None = None,
    angle: float = 0.0,
    blend: str = "multiply",
    remove_white: bool = False,
    white_threshold: int = 235,
) -> Image.Image:
    base = Image.open(base_img_path).convert("RGBA")
    tattoo = Image.open(tattoo_img_path).convert("RGBA")

    if remove_white:
        tattoo = remove_white_background(tattoo, white_threshold)

    tattoo = resize_tattoo(tattoo, scale=scale, target_width=width)

    if angle:
        tattoo = tattoo.rotate(angle, expand=True, resample=Image.Resampling.BICUBIC)

    tattoo = apply_opacity(tattoo, opacity)

    if blend == "normal":
        return normal_blend(base, tattoo, position)
    elif blend == "multiply":
        return multiply_blend(base, tattoo, position)
    else:
        raise ValueError(f"Unsupported blend mode: {blend}")


def load_mask(mask_path: str | Path) -> np.ndarray:
    mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)
    if mask is None:
        raise FileNotFoundError(f"Could not load mask: {mask_path}")
    return mask


def clean_mask(mask: np.ndarray, threshold: int = 127, dilate: int = 0, blur: int = 0) -> np.ndarray:
    _, mask_bin = cv2.threshold(mask, threshold, 255, cv2.THRESH_BINARY)

    if dilate > 0:
        kernel = np.ones((dilate, dilate), np.uint8)
        mask_bin = cv2.dilate(mask_bin, kernel, iterations=1)

    if blur > 0:
        k = blur if blur % 2 == 1 else blur + 1
        mask_bin = cv2.GaussianBlur(mask_bin, (k, k), 0)
        _, mask_bin = cv2.threshold(mask_bin, 1, 255, cv2.THRESH_BINARY)

    return mask_bin


def inpaint_image(
    base_img_path: str | Path,
    mask_img_path: str | Path,
    radius: float = 5.0,
    method: str = "telea",
    threshold: int = 127,
    dilate: int = 0,
    blur: int = 0,
) -> Image.Image:
    image = cv2.imread(str(base_img_path), cv2.IMREAD_COLOR)
    if image is None:
        raise FileNotFoundError(f"Could not load base image: {base_img_path}")

    mask = load_mask(mask_img_path)
    mask = clean_mask(mask, threshold=threshold, dilate=dilate, blur=blur)

    flag = cv2.INPAINT_TELEA if method == "telea" else cv2.INPAINT_NS
    result = cv2.inpaint(image, mask, radius, flag)

    result_rgb = cv2.cvtColor(result, cv2.COLOR_BGR2RGB)
    return Image.fromarray(result_rgb)


def save_image(img: Image.Image, output: str | Path) -> None:
    output = Path(output)
    img.save(output)
    print(f"Saved: {output}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Tattoo overlay and inpainting tool")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # overlay
    p_overlay = subparsers.add_parser("overlay", help="Overlay a tattoo image onto a photo")
    p_overlay.add_argument("base_image")
    p_overlay.add_argument("tattoo_image")
    p_overlay.add_argument("--x", type=int, required=True)
    p_overlay.add_argument("--y", type=int, required=True)
    p_overlay.add_argument("--opacity", type=float, default=0.65)
    p_overlay.add_argument("--scale", type=float, default=None)
    p_overlay.add_argument("--width", type=int, default=None)
    p_overlay.add_argument("--angle", type=float, default=0.0)
    p_overlay.add_argument("--blend", choices=["normal", "multiply"], default="multiply")
    p_overlay.add_argument("--remove-white", action="store_true")
    p_overlay.add_argument("--white-threshold", type=int, default=235)
    p_overlay.add_argument("--output", default="simulated_tattoo.png")

    # inpaint
    p_inpaint = subparsers.add_parser("inpaint", help="Remove an existing tattoo/object using a mask")
    p_inpaint.add_argument("base_image")
    p_inpaint.add_argument("mask_image", help="White area = remove/inpaint, black area = keep")
    p_inpaint.add_argument("--radius", type=float, default=5.0)
    p_inpaint.add_argument("--method", choices=["telea", "ns"], default="telea")
    p_inpaint.add_argument("--threshold", type=int, default=127)
    p_inpaint.add_argument("--dilate", type=int, default=0, help="Dilate mask to cover edges")
    p_inpaint.add_argument("--blur", type=int, default=0, help="Blur mask before binarizing")
    p_inpaint.add_argument("--output", default="inpainted.png")

    # replace
    p_replace = subparsers.add_parser("replace", help="Inpaint old tattoo first, then overlay new one")
    p_replace.add_argument("base_image")
    p_replace.add_argument("mask_image")
    p_replace.add_argument("tattoo_image")
    p_replace.add_argument("--x", type=int, required=True)
    p_replace.add_argument("--y", type=int, required=True)
    p_replace.add_argument("--opacity", type=float, default=0.65)
    p_replace.add_argument("--scale", type=float, default=None)
    p_replace.add_argument("--width", type=int, default=None)
    p_replace.add_argument("--angle", type=float, default=0.0)
    p_replace.add_argument("--blend", choices=["normal", "multiply"], default="multiply")
    p_replace.add_argument("--remove-white", action="store_true")
    p_replace.add_argument("--white-threshold", type=int, default=235)
    p_replace.add_argument("--radius", type=float, default=5.0)
    p_replace.add_argument("--method", choices=["telea", "ns"], default="telea")
    p_replace.add_argument("--threshold", type=int, default=127)
    p_replace.add_argument("--dilate", type=int, default=0)
    p_replace.add_argument("--blur", type=int, default=0)
    p_replace.add_argument("--output", default="replaced_tattoo.png")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "overlay":
        result = overlay_tattoo(
            base_img_path=args.base_image,
            tattoo_img_path=args.tattoo_image,
            position=(args.x, args.y),
            opacity=args.opacity,
            scale=args.scale,
            width=args.width,
            angle=args.angle,
            blend=args.blend,
            remove_white=args.remove_white,
            white_threshold=args.white_threshold,
        )
        save_image(result.convert("RGB"), args.output)
        return

    if args.command == "inpaint":
        result = inpaint_image(
            base_img_path=args.base_image,
            mask_img_path=args.mask_image,
            radius=args.radius,
            method=args.method,
            threshold=args.threshold,
            dilate=args.dilate,
            blur=args.blur,
        )
        save_image(result.convert("RGB"), args.output)
        return

    if args.command == "replace":
        cleaned = inpaint_image(
            base_img_path=args.base_image,
            mask_img_path=args.mask_image,
            radius=args.radius,
            method=args.method,
            threshold=args.threshold,
            dilate=args.dilate,
            blur=args.blur,
        )

        temp_path = Path("_temp_inpaint_base.png")
        cleaned.save(temp_path)

        result = overlay_tattoo(
            base_img_path=temp_path,
            tattoo_img_path=args.tattoo_image,
            position=(args.x, args.y),
            opacity=args.opacity,
            scale=args.scale,
            width=args.width,
            angle=args.angle,
            blend=args.blend,
            remove_white=args.remove_white,
            white_threshold=args.white_threshold,
        )
        save_image(result.convert("RGB"), args.output)

        if temp_path.exists():
            temp_path.unlink()
        return


if __name__ == "__main__":
    main()
