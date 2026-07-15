#!/bin/bash
# Builds a "sparse" ambient loop: a quiet continuous base bed with a short
# characteristic burst clip scattered at irregular offsets on top, then
# normalized as a whole to a target LUFS. Used to turn continuously-active
# Cold War textures (typewriter, morse, switchboard, teletype) into
# occasional events over near-silent room tone, per the note that ambience
# should stay atmosphere rather than content.
set -e
FF="$FFDIR/ffmpeg.exe"

# args: base_src base_start base_len burst_src burst_start burst_len base_gain burst_gain out_len offsets(csv) target_lufs out_file
build_sparse() {
  local base_src="$1" base_start="$2" base_len="$3"
  local burst_src="$4" burst_start="$5" burst_len="$6"
  local base_gain="$7" burst_gain="$8" out_len="$9" offsets="${10}" lufs="${11}" out="${12}"

  local base_end=$(awk "BEGIN{print $base_start + $out_len}")
  local burst_end=$(awk "BEGIN{print $burst_start + $burst_len}")
  local fadeout_st=$(awk "BEGIN{print $out_len - 1}")

  # Build N delayed copies of the burst, one per offset, into a filter graph.
  local inputs=("-i" "$base_src" "-i" "$burst_src")
  local filter="[0:a]atrim=${base_start}:${base_end},asetpts=PTS-STARTPTS,volume=${base_gain}[base];"
  filter+="[1:a]atrim=${burst_start}:${burst_end},asetpts=PTS-STARTPTS,volume=${burst_gain}[burstsrc];"

  IFS=',' read -ra OFFS <<< "$offsets"
  local mixlabels="[base]"
  local n=1
  for off in "${OFFS[@]}"; do
    local ms=$(awk "BEGIN{print int($off * 1000)}")
    filter+="[burstsrc]adelay=${ms}|${ms}[b${n}];"
    mixlabels+="[b${n}]"
    n=$((n+1))
  done
  local total=$((n))
  filter+="${mixlabels}amix=inputs=${total}:duration=first:dropout_transition=0,afade=t=in:st=0:d=1,afade=t=out:st=${fadeout_st}:d=1,loudnorm=I=${lufs}:TP=-3:LRA=11[aout]"

  "$FF" -y "${inputs[@]}" -filter_complex "$filter" -map "[aout]" -q:a 4 "$out" 2>&1 | tail -2
}
