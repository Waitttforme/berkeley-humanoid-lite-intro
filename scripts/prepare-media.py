"""Prepare lightweight presentation assets from the project's official source media."""

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / "public" / "media"


def make_robot_cutout() -> None:
    source = Image.open(MEDIA / "bhl-cover.png").convert("RGB")
    # The official cover contains the physical robot on the left and a CAD view
    # on the right. Keep the physical platform for the hero composition.
    robot = source.crop((0, 0, 2450, source.height))
    target_height = 1900
    robot = robot.resize(
        (round(robot.width * target_height / robot.height), target_height),
        Image.Resampling.LANCZOS,
    )

    flooded = robot.copy()
    draw = ImageDraw.Draw(flooded)
    for point in (
        (0, 0),
        (flooded.width - 1, 0),
        (0, flooded.height - 1),
        (flooded.width - 1, flooded.height - 1),
    ):
        ImageDraw.floodfill(flooded, point, (255, 0, 255), thresh=18)

    alpha = Image.new("L", flooded.size, 255)
    pixels = flooded.load()
    alpha_pixels = alpha.load()
    for y in range(flooded.height):
        for x in range(flooded.width):
            red, green, blue = pixels[x, y]
            if red > 245 and green < 12 and blue > 245:
                alpha_pixels[x, y] = 0

    rgba = robot.convert("RGBA")
    rgba.putalpha(alpha)
    bbox = alpha.getbbox()
    if bbox:
        rgba = rgba.crop(bbox)
    rgba.save(MEDIA / "bhl-robot-cutout.png", optimize=True)


if __name__ == "__main__":
    make_robot_cutout()
