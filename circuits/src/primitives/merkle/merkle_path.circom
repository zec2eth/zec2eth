pragma circom 2.0.0;

include "./sha256_concat.circom";

template MerklePath(DEPTH) {
    // ---------- INPUTS ----------
    signal input leaf_hi;
    signal input leaf_lo;

    signal input sibling_hi[DEPTH];
    signal input sibling_lo[DEPTH];
    signal input path_dir[DEPTH];      // 0 = cur left, 1 = cur right

    // ---------- OUTPUTS ----------
    signal output root_hi;
    signal output root_lo;

    // ---------- INTERNAL ----------
    // cur_hi[i], cur_lo[i] = node value at level i (0 = leaf)
    signal cur_hi[DEPTH + 1];
    signal cur_lo[DEPTH + 1];

    cur_hi[0] <== leaf_hi;
    cur_lo[0] <== leaf_lo;

    component h[DEPTH];

    signal not_dir[DEPTH];

    // MUX intermediate terms
    signal t_left_hi_1[DEPTH];
    signal t_left_hi_2[DEPTH];
    signal t_left_lo_1[DEPTH];
    signal t_left_lo_2[DEPTH];

    signal t_right_hi_1[DEPTH];
    signal t_right_hi_2[DEPTH];
    signal t_right_lo_1[DEPTH];
    signal t_right_lo_2[DEPTH];

    signal mux_left_hi[DEPTH];
    signal mux_left_lo[DEPTH];
    signal mux_right_hi[DEPTH];
    signal mux_right_lo[DEPTH];

    // ---------- MERKLE STEPS ----------
    for (var i = 0; i < DEPTH; i++) {

        // boolean constraint
        path_dir[i] * (path_dir[i] - 1) === 0;

        // not_dir = 1 - path_dir
        not_dir[i] <== 1 - path_dir[i];

        // ---- LEFT MUX ----
        t_left_hi_1[i] <== sibling_hi[i] * path_dir[i];
        t_left_hi_2[i] <== cur_hi[i]     * not_dir[i];
        mux_left_hi[i] <== t_left_hi_1[i] + t_left_hi_2[i];

        t_left_lo_1[i] <== sibling_lo[i] * path_dir[i];
        t_left_lo_2[i] <== cur_lo[i]     * not_dir[i];
        mux_left_lo[i] <== t_left_lo_1[i] + t_left_lo_2[i];

        // ---- RIGHT MUX ----
        t_right_hi_1[i] <== cur_hi[i]     * path_dir[i];
        t_right_hi_2[i] <== sibling_hi[i] * not_dir[i];
        mux_right_hi[i] <== t_right_hi_1[i] + t_right_hi_2[i];

        t_right_lo_1[i] <== cur_lo[i]     * path_dir[i];
        t_right_lo_2[i] <== sibling_lo[i] * not_dir[i];
        mux_right_lo[i] <== t_right_lo_1[i] + t_right_lo_2[i];

        // hash node
        h[i] = Sha256ConcatHiLo();

        h[i].left_hi  <== mux_left_hi[i];
        h[i].left_lo  <== mux_left_lo[i];
        h[i].right_hi <== mux_right_hi[i];
        h[i].right_lo <== mux_right_lo[i];

        // ---- update next level state ----
        cur_hi[i + 1] <== h[i].out_hi;
        cur_lo[i + 1] <== h[i].out_lo;
    }

    // final result
    root_hi <== cur_hi[DEPTH];
    root_lo <== cur_lo[DEPTH];
}
