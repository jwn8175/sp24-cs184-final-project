#version 330

uniform vec2 resolution;
uniform sampler2D texture_1;

out vec4 out_color;

void main() {
    /* This translates gl_FragCoord to a normalized coordinate in the range [0, 1]. */
    vec2 uv = gl_FragCoord.xy * 0.5 / resolution;
    if (0.25 < uv.x && uv.x < 0.75 && 0.25 < uv.y && uv.y < 0.75) {
        /* Here uv is "re-normalized" to the range [0, 1] again before sampling from the texture. */
        out_color = texture(texture_1, (uv / 0.5 - 0.5));
    } else {
        /* Out of range values are set to black. */
        out_color = vec4(0.0);
    }
}

/*
uv coordinate is in this range:
(0, 1) (1, 1)
(0, 0) (1, 0)
*/

/*
v_text coordinate is in this range:
(0, 1) (1, 1)
(0, 0) (1, 0)
*/
