#version 330

uniform vec2 resolution;
uniform sampler2D texture_1;

out vec4 out_color;

void main() {
    /* Circle implementation of the Kuwahara filter here. */
    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / resolution.y;
    out_color = texture(texture_1, uv);
}
