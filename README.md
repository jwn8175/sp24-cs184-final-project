# sp24-cs184-final-project

## Usage

### Default

Running `python3 main.py` will start the program with a default window size based on the size of the input texture.

### Adjusting Filter Kernel Size

If running a variant of the Kuwahara filters, you can adjust the kernel size of filter applied to the rendered image by using the `-` and `+` keys.

### Custom Window Size

Running `python3 main.py --size [WIDTH]x[HEIGHT]` will start the program with a custom window size of `(WIDTH, HEIGHT)`. Don't forget to include the `x` in between the two values.

## Project TODOs

### Features

1. Implement the anisotropic Kuwahara filter
1. Bypass uniform limit to pass more seeds for the Voronoi filters
1. Streaming real-time video data from a camera to the program
