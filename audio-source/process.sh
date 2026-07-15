#!/bin/bash
set -e
FF="$FFDIR/ffmpeg.exe"
RAW="raw"

# --- SFX: short one-shots, consistent punch (I=-16 LUFS) ---
"$FF" -y -i "raw/sfx/decision-made.mp3" \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11" -q:a 4 ../public/audio/sfx/decision-made.mp3

"$FF" -y -i "raw/sfx/law-passed.mp3" \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11" -q:a 4 ../public/audio/sfx/law-passed.mp3

"$FF" -y -i "raw/sfx/law-failed.mp3" \
  -af "atrim=0:2.4,afade=t=out:st=2.0:d=0.4,loudnorm=I=-16:TP=-1.5:LRA=11" -q:a 4 ../public/audio/sfx/law-failed.mp3

"$FF" -y -i "raw/sfx/breaking-news.mp3" \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11" -q:a 4 ../public/audio/sfx/breaking-news.mp3

# --- MUSIC: trim to a punchy sting + fade out, consistent level (I=-18 LUFS) ---
"$FF" -y -i "raw/music/election-victory.mp3" \
  -af "atrim=0:11,afade=t=in:st=0:d=0.15,afade=t=out:st=9:d=2,loudnorm=I=-18:TP=-1.5:LRA=11" -q:a 3 ../public/audio/music/election-victory.mp3

"$FF" -y -i "raw/music/election-concession.mp3" \
  -af "atrim=0:12,afade=t=in:st=0:d=0.3,afade=t=out:st=9.5:d=2.5,loudnorm=I=-18:TP=-1.5:LRA=11" -q:a 3 ../public/audio/music/election-concession.mp3

"$FF" -y -i "raw/music/inauguration.mp3" \
  -af "atrim=0:11,afade=t=in:st=0:d=0.15,afade=t=out:st=9:d=2,loudnorm=I=-18:TP=-1.5:LRA=11" -q:a 3 ../public/audio/music/inauguration.mp3

"$FF" -y -i "raw/music/legacy-triumphant.mp3" \
  -af "atrim=0:13,afade=t=in:st=0:d=0.2,afade=t=out:st=10.5:d=2.5,loudnorm=I=-18:TP=-1.5:LRA=11" -q:a 3 ../public/audio/music/legacy-triumphant.mp3

"$FF" -y -i "raw/music/legacy-somber.mp3" \
  -af "atrim=0:13,afade=t=in:st=0:d=0.3,afade=t=out:st=10:d=3,loudnorm=I=-18:TP=-1.5:LRA=11" -q:a 3 ../public/audio/music/legacy-somber.mp3

# --- AMBIENT: ~40s loop window, fade in/out to mask the loop seam, quiet consistent bed (I=-26 LUFS) ---
loop_cut() {
  local src="$1" dst="$2" start="$3" len="$4"
  local end fadeout
  end=$(awk "BEGIN{print $start + $len}")
  fadeout=$(awk "BEGIN{print $len - 1}")
  "$FF" -y -i "$src" \
    -af "atrim=${start}:${end},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=1,afade=t=out:st=${fadeout}:d=1,loudnorm=I=-26:TP=-2:LRA=11" \
    -q:a 4 "$dst"
}

OUT="../public/audio/ambient"
loop_cut "$RAW/ambient/oval-office.mp3"          "$OUT/oval-office.mp3"          8  40
loop_cut "$RAW/ambient/cabinet-room.mp3"         "$OUT/cabinet-room.mp3"         10 40
loop_cut "$RAW/ambient/situation-room.mp3"       "$OUT/situation-room.mp3"       8  40
loop_cut "$RAW/ambient/diplomatic-office.mp3"    "$OUT/diplomatic-office.mp3"    15 40
loop_cut "$RAW/ambient/congress.mp3"             "$OUT/congress.mp3"             8  40
loop_cut "$RAW/ambient/press-room.mp3"           "$OUT/press-room.mp3"           2  22
loop_cut "$RAW/ambient/oval-office-cw.mp3"       "$OUT/oval-office-cw.mp3"       5  40
loop_cut "$RAW/ambient/cabinet-room-cw.mp3"      "$OUT/cabinet-room-cw.mp3"      8  40
loop_cut "$RAW/ambient/situation-room-cw.mp3"    "$OUT/situation-room-cw.mp3"    5  40
loop_cut "$RAW/ambient/diplomatic-office-cw.mp3" "$OUT/diplomatic-office-cw.mp3" 2  38
loop_cut "$RAW/ambient/congress-cw.mp3"          "$OUT/congress-cw.mp3"          8  40
loop_cut "$RAW/ambient/press-room-cw.mp3"         "$OUT/press-room-cw.mp3"        5  40

echo "DONE"
