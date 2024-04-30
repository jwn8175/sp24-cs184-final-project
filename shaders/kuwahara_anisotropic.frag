#version 330

// The following is heavily inspired by the approach+code outlined in the following texts:
// https://www.taylorfrancis.com/chapters/edit/10.1201/b10648-22/anisotropic-kuwahara-filtering-gpu
// and https://www.kyprianidis.com/p/pg2009/jkyprian-pg2009.pdf

uniform sampler2D tex;

uniform float inv_tex_width;
uniform float inv_tex_height;
uniform float tex_height;
uniform float tex_width;
uniform float tex_size;
uniform int kernel_size;

in vec2 uv;

out vec4 out_color;

const float PI = 3.14159265358979323846;
const float inv_root_two_pi = 0.3989422804;
const float inv_two_pi = 0.15915494309;
const float sin_pi_fourths = 0.707106781187;


const int N = 8;
// As per GPU Pro, alpha always equals 1
const float alpha = 1.0;
// From kuwahara_circle.frag:
/* After some basic experimentation I've come to the conclusion that using higher values
   for both of these constants results in a sharper image. */
/* [1, 18] */
const float q = 18.0;
/* [0, 100] */
const float hardness = 100.0;

// Weights and offsets generated by https://lisyarus.github.io/blog/posts/blur-coefficients-generator.html
// Sigma = 2, blur radius = 5
const int SAMPLE_COUNT = 6;

const float OFFSETS[6] = float[6](
    -4.2493201357512165,
    -2.351564403533789,
    -0.46943377969837197,
    1.409199877085212,
    3.2979348079914823,
    5
);

const float WEIGHTS[6] = float[6](
    0.03730160027910494,
    0.1876867142594754,
    0.37430973652704624,
    0.2974163809054194,
    0.09398552798363,
    0.00930004004532405
);


float gaussian2D(float sigma, vec2 coor) {
    float inv_sigma_squared = 1.0 / (sigma * sigma);
    return inv_sigma_squared * inv_two_pi * exp(-1.0 * (coor.x * coor.x + coor.y * coor.y) / (2 * sigma * sigma));
}


float gaussian(float sigma, float coor) {
    return inv_root_two_pi * (1.0 / sigma) * exp(-1.0 * (coor * coor) / (2.0 * sigma * sigma));
}

// Code based off of https://www.taylorfrancis.com/chapters/edit/10.1201/b10648-22/anisotropic-kuwahara-filtering-gpu
vec4 get_structure_tensor(vec2 offset) {
    // vec3 c = texture(tex, uv).rgb;
    
    // Edge detection based on the Sobel filter matrix

    // Apply the horizontal Sobel filter
    vec2 uv_offset = uv + offset;
    vec3 u = (  -1.0 * texture(tex, uv_offset + vec2(-inv_tex_width, -inv_tex_height)).rgb +
                -2.0 * texture(tex, uv_offset + vec2(-inv_tex_width, 0.0)).rgb +
                -1.0 * texture(tex, uv_offset + vec2(-inv_tex_width, inv_tex_height)).rgb +
                 1.0 * texture(tex, uv_offset + vec2(inv_tex_width, -inv_tex_height)).rgb +
                 2.0 * texture(tex, uv_offset + vec2(inv_tex_width, 0.0)).rgb +
                 1.0 * texture(tex, uv_offset + vec2(inv_tex_width, inv_tex_height)).rgb
                ) / 4.0;

    // Apply the vertical Sobel filter
    vec3 v = (  -1.0 * texture(tex, uv_offset + vec2(-inv_tex_width, -inv_tex_height)).rgb +
                -2.0 * texture(tex, uv_offset + vec2(0.0, -inv_tex_height)).rgb +
                -1.0 * texture(tex, uv_offset + vec2(inv_tex_width, -inv_tex_height)).rgb +
                 1.0 * texture(tex, uv_offset + vec2(-inv_tex_width, inv_tex_height)).rgb +
                 2.0 * texture(tex, uv_offset + vec2(0.0, inv_tex_height)).rgb +
                 1.0 * texture(tex, uv_offset + vec2(inv_tex_width, inv_tex_height)).rgb
                ) / 4.0;

    // This line returns the structure tensor for the current pixel
    // This outputs the tensor elements as E, F, G
    // Where the tensor itself is structured as a 2x2 matrix::
    // [ E  F ]
    // [ F  G ]
    return vec4(dot(u, u), dot(v, v), dot(u, v), 1.0);
}

// This calculates a smoothed out version of the structure tensor by applying a Gaussian filter to it.
// Code referenced from https://lisyarus.github.io/blog/posts/blur-coefficients-generator.html
vec4 get_gaussian_blur_structure_tensor() {

    vec2 horizontal_blur = vec2(1, 0);
    vec2 vertical_blur = vec2(0, 1);
    vec2 size = textureSize(tex, 0);
    vec4 gauss_struct_tens = vec4(0.0);
    float weight_sum = 0.0;

    out_color = vec4(0.0, 0.0, 0.0, 0.0);
    
    for (int i = 0; i < SAMPLE_COUNT; i++) {
        vec2 offset = horizontal_blur * OFFSETS[i] / size;
        gauss_struct_tens += get_structure_tensor(offset) * WEIGHTS[i];
        weight_sum += WEIGHTS[i];
        // out_color += texture(tex, uv + offset) * WEIGHTS[i];
    }

    return gauss_struct_tens / weight_sum;
}

// Code based off of https://www.taylorfrancis.com/chapters/edit/10.1201/b10648-22/anisotropic-kuwahara-filtering-gpu
vec4 get_orient_aniso() {
    vec4 samp = get_gaussian_blur_structure_tensor(); // texture(tex, uv).xyz;
    float eigenval1 = 0.5 * (samp.y + 
                             samp.x + 
                             sqrt(samp.y * samp.y - 
                             2.0 * samp.x * samp.y +
                             samp.x * samp.x + 
                             4.0 * samp.z * samp.z));

    float eigenval2 = 0.5 * (samp.y + 
                             samp.x - 
                             sqrt(samp.y * samp.y - 
                             2.0 * samp.x * samp.y + 
                             samp.x * samp.x + 
                             4.0 * samp.z * samp.z));

    // Get eigenvector pointed in direction of minimum rate of change
    vec2 eigentex = vec2(eigenval1 - samp.x, -samp.z);
    vec2 adjust_eigentex = vec2(0, 1.0);
    if (length(eigentex) > 0.0) {
        adjust_eigentex = normalize(eigentex);
    }

    // Calculate angle of ellipse
    float phi = atan(adjust_eigentex.y, adjust_eigentex.x);

    // Calculate the measure of anisotrophy of the ellipse (between 0, iso, and 1, aniso)
    float anisotrophy = 0.0;
    if (eigenval1 + eigenval2 > 0.0) {
        anisotrophy = (eigenval1 - eigenval2) / (eigenval1 + eigenval2);
    }

    // Return a vector containing the e-vecs of the structure tensor, phi, and the anisotrophy of the ellipse
    return vec4(adjust_eigentex, phi, anisotrophy);
}

// Some of the below code is based off of the approach outlined in:
// https://www.taylorfrancis.com/chapters/edit/10.1201/b10648-22/anisotropic-kuwahara-filtering-gpu
void main() {
    float zeta = 1.0 / float(kernel_size);
    float zero_cross = 0.58;
    float sin_zero_cross = sin(zero_cross);
    float eta = (zeta + cos(zero_cross)) / (sin_zero_cross * sin_zero_cross);

    int radius = kernel_size / 2;

    // Use the orient_anisotrophy function for this... 
    vec4 eigenvec = get_orient_aniso();     // texture2D(tfm, uv);

    vec4 mean[N];
    vec3 standard_dev[N];

    // Create mean + standard deviation vectors
    for (int i = 0; i < N; i++) {
        mean[i] = vec4(0.0, 0.0, 0.0, 0.0);
        standard_dev[i] = vec3(0.0, 0.0, 0.0);
    } 

    // Calculate the major and minor axis values of the ellipse
    // replace alpha with ALPHA if need be
    float major_axis = radius * clamp ((alpha + eigenvec.w) / alpha , 0.1, 2.0);
    float minor_axis = radius * clamp (alpha / (alpha + eigenvec.w), 0.1, 2.0);
    float cos_phi = cos(eigenvec.z);
    float sin_phi = sin(eigenvec.z);

    // The following transformation maps an ellipse with major_axis, minor_axis, and angle phi
    // to a disk/circle with radius 0.5
    mat2 R = mat2(cos_phi, -sin_phi, sin_phi, cos_phi);
    mat2 S = mat2 (0.5 / major_axis, 0.0, 0.0, 0.5 / minor_axis);
    mat2 SR = S * R;

    int max_x = int(sqrt(major_axis * major_axis * cos_phi * cos_phi + minor_axis*minor_axis * sin_phi * sin_phi));
    int max_y = int(sqrt(major_axis * major_axis * sin_phi * sin_phi + minor_axis*minor_axis * cos_phi * cos_phi));

    /*
    // Calculate the mean and standard deviation values for the generalized Kuwahara filter
    for (int j = -max_y; j <= max_y; j++) {
        for (int i = -max_x; i <= max_x; i++) {
            vec2 v = SR * vec2(i, j);
            if (dot(v, v) <= 0.25) {
                vec3 epic_color = texture(tex, uv + vec2(i, j) / (tex_width * tex_height)).rgb;
                for (int k = 0; k < N; k++) {
                    // Make this a Gaussian or nah?
                    float weight = 1.0 / N;
                    mean[k] += vec4(epic_color * weight, weight);
                    standard_dev[k] += epic_color * epic_color * weight;
                }
            }
        }
    }
    */


    // Copy-pasted directly from kuwahara_circle.frag
    // with slight modifications
    for (int i = -kernel_size; i <= kernel_size; ++i) {
        for (int j = -kernel_size; j <= kernel_size; ++j) {
            
            vec2 kernel_uv = uv + vec2(float(i) * inv_tex_width, float(j) * inv_tex_height);
            vec3 col = texture(tex, kernel_uv).rgb;
            vec2 v = SR * vec2(i, j); //vec2 v = vec2(float(i), float(j)) / float(kernel_size);

            float sum = 0.0;
            float w[8];
            float z, vxx, vyy;

            /* Compute polynomial weights. */
            /* For N=8 the vector v has to be rotated by pi/4. Since rotation by multiple of pi/2 
            can be performed by swapping and negating coordinates, we perform the computation 
            in two stages. We first calculate weights for 0, pi/2, pi, 3pi/2. */
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

            /* Then rotate by pi/4 and calculate the weights for pi/4, 3pi/4, 5pi/4, and 7pi/4. */
            v = sin_pi_fourths * vec2(v.x - v.y, v.x + v.y);
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

            float g = exp(-3.125 * dot(v, v)) / sum;

            for (int k = 0 ; k < 8; ++k) {
                float wk = w[k] * g;
                mean[k] += vec4(col * wk, wk);
                standard_dev[k] += col * col * wk;
            }
        }
    }

    vec4 temp = vec4(0.0);
    for (int k = 0; k < N; ++k) {
        /* Average the color of sector k. */
        mean[k].rgb /= mean[k].w;
        standard_dev[k] = abs(standard_dev[k] / mean[k].w - mean[k].rgb * mean[k].rgb);

        /* Compute weight based on std and other values. */
        float sigma2 = standard_dev[k].r + standard_dev[k].g + standard_dev[k].b;
        float w = 1.0 / (1.0 + pow(hardness * 1000.0 * sigma2, 0.5 * q));
        
        /* Multiply the color of this sector by weight and add it to temp sum. */
        temp += vec4(mean[k].rgb * w, w);
    }

    /* Divide temp color sum by sum of weights for final color. */
    out_color = temp / temp.w;
}