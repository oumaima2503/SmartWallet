import io

from PIL import Image, ImageOps, UnidentifiedImageError

MAX_SIDE = 2000


class InvalidImageError(Exception):
    pass


def prepare_image(data: bytes) -> bytes:
    """Fixes the rotation from the phone camera, converts to RGB and limits the size.
    Returns JPEG bytes ready for OCR."""
    try:
        image = Image.open(io.BytesIO(data))
        image = ImageOps.exif_transpose(image)
    except (UnidentifiedImageError, OSError) as error:
        raise InvalidImageError("The file is not a readable image") from error

    image = image.convert("RGB")
    image.thumbnail((MAX_SIDE, MAX_SIDE))

    # A little more contrast helps with faded thermal receipts
    image = ImageOps.autocontrast(image, cutoff=1)

    output = io.BytesIO()
    image.save(output, format="JPEG", quality=90)
    return output.getvalue()
