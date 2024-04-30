#version 330

uniform sampler2D tex;
uniform float inv_tex_width;
uniform float inv_tex_height;

in vec2 uv;

out vec4 out_color;

// Heavily inspired by the approach outlined in the following text:
// https://www.taylorfrancis.com/chapters/edit/10.1201/b10648-22/anisotropic-kuwahara-filtering-gpu
// This is part of a multi-step process for the anisotropic kuwahara filter.
// This is the first filter applied.

void main() {
    // vec3 c = texture(tex, uv).rgb;
    // Edge detection based on the Sobel filter matrix

    // Applying the horizontal Sobel filter
    vec3 u = (  -1.0 * texture(tex , uv + vec2(-inv_tex_width, -inv_tex_height)).rgb +
                -2.0 * texture(tex , uv + vec2(-inv_tex_width, 0.0)).rgb +
                -1.0 * texture(tex , uv + vec2(-inv_tex_width, inv_tex_height)).rgb +
                 1.0 * texture(tex , uv + vec2( inv_tex_width, -inv_tex_height)).rgb +
                 2.0 * texture(tex , uv + vec2( inv_tex_width, 0.0)).rgb +
                 1.0 * texture(tex , uv + vec2( inv_tex_width, inv_tex_height)).rgb
                ) / 4.0;

    // Applying the vertical Sobel filter
    vec3 v = (  -1.0 * texture(tex , uv + vec2(-inv_tex_width, -inv_tex_height)).rgb +
                -2.0 * texture(tex , uv + vec2( 0.0, -inv_tex_height)).rgb +
                -1.0 * texture(tex , uv + vec2( inv_tex_width, -inv_tex_height)).rgb +
                 1.0 * texture(tex , uv + vec2(-inv_tex_width, inv_tex_height)).rgb +
                 2.0 * texture(tex , uv + vec2( 0.0, inv_tex_height)).rgb +
                 1.0 * texture(tex , uv + vec2( inv_tex_width, inv_tex_height)).rgb
                ) / 4.0;

    out_color = vec4(dot(u, u), dot(v, v), dot(u, v), 1.0);
}

