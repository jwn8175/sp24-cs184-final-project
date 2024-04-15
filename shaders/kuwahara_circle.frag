#version 330

uniform sampler2D tex;
uniform float inv_tex_width;
uniform float inv_tex_height;

in vec2 uv;

out vec4 out_color;

const int ksize = 5;
const int N = 4;
const float q = 8.0;
const float hardness = 8.0;

void main() {
    float zeta = 1.0 / float(ksize);
    float zero_cross = 0.58;
    float sin_zero_cross = sin(zero_cross);
    float eta = (zeta + cos(zero_cross)) / (sin_zero_cross * sin_zero_cross);
    vec4 m[8];
    vec3 s[8];

    for (int k = 0; k < N; ++k) {
        m[k] = vec4(0.0);
        s[k] = vec3(0.0);
    }

    out_color = vec4(0.0);
    for (int i = -ksize; i <= ksize; ++i) {
        for (int j = -ksize; j <= ksize; ++j) {
            vec2 kernel_uv = uv + vec2(float(i) * inv_tex_width, float(j) * inv_tex_height);
            vec3 col = texture(tex, kernel_uv).rgb;
            vec2 v = vec2(i, j) / ksize;

            float sum = 0.0;
            float w[8];
            float z, vxx, vyy;

            vxx = zeta - eta * v.x * v.x;
            vyy = zeta - eta * v.y * v.y;

            z = max(0, v.y + vxx); 
            w[0] = z * z;
            sum += w[0];
            z = max(0, -v.x + vyy); 
            w[2] = z * z;
            sum += w[2];
            z = max(0, -v.y + vxx); 
            w[4] = z * z;
            sum += w[4];
            z = max(0, v.x + vyy); 
            w[6] = z * z;
            sum += w[6];

            v = sqrt(2.0) / 2.0 * vec2(v.x - v.y, v.x + v.y);
            vxx = zeta - eta * v.x * v.x;
            vyy = zeta - eta * v.y * v.y;
            z = max(0, v.y + vxx); 
            w[1] = z * z;
            sum += w[1];
            z = max(0, -v.x + vyy); 
            w[3] = z * z;
            sum += w[3];
            z = max(0, -v.y + vxx); 
            w[5] = z * z;
            sum += w[5];
            z = max(0, v.x + vyy); 
            w[7] = z * z;
            sum += w[7];

            float g = exp(-3.125 * dot(v,v)) / sum;

            for (int k = 0 ; k < 8; ++k) {
                float wk = w[k] * g;
                m[k] += vec4(col * wk, wk);
                s[k] += col * col * wk;
            }
        }
    }

    vec4 temp = vec4(0.0);
    for (int k = 0; k < N; ++k) {
        m[k].rgb /= m[k].w;
        s[k] = abs(s[k] / m[k].w - m[k].rgb * m[k].rgb);

        float sigma2 = s[k].r + s[k].g + s[k].b;
        float w = 1.0 / (1.0 + pow(hardness * 1000.0 * sigma2, 0.5 * q));

        temp += vec4(m[k].rgb * w, w);
    }

    out_color = temp / temp.w;
}
