#!/usr/bin/env bash
# turns raw video into a small muted loop + poster for the site.
#   scripts/clip.sh <input> <name> [start-seconds] [duration-seconds] [width]
#   scripts/clip.sh --stack <top> <bottom> <name> [width] [seconds]   (stacks two clips, both cut to the shorter one)
# writes public/media/<name>.mp4 and public/media/<name>.jpg
set -euo pipefail

out=public/media
encode=(-an -c:v libx264 -preset slow -crf 30 -pix_fmt yuv420p -movflags +faststart)
mkdir -p "$out"

if [[ $1 == --stack ]]; then
	top=$2 bottom=$3 name=$4 width=${5:-480} dur=${6:+-t $6}
	ffmpeg -v error -y -i "$top" -i "$bottom" -filter_complex \
		"[0:v]scale=${width}:-2:flags=lanczos,fps=24,setsar=1[t];[1:v]scale=${width}:-2:flags=lanczos,fps=24,setsar=1[b];[t][b]vstack=shortest=1[v]" \
		-map "[v]" $dur "${encode[@]}" "$out/$name.mp4"
else
	in=$1 name=$2 start=${3:-0} dur=${4:-8} width=${5:-640}
	ffmpeg -v error -y -ss "$start" -t "$dur" -i "$in" \
		-vf "scale=${width}:-2:flags=lanczos,fps=24" "${encode[@]}" "$out/$name.mp4"
fi

ffmpeg -v error -y -i "$out/$name.mp4" -frames:v 1 -q:v 4 "$out/$name.jpg"

du -h "$out/$name.mp4" "$out/$name.jpg"
