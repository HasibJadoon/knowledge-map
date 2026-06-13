#!/usr/bin/env python3
"""Pre-render a worldview reading unit to a single high-quality neural MP3 plus
a timing map (Speechify-style).

Audio is synthesised offline with Piper (en-US Ryan, high). Each reading block is
spoken as one fluent utterance (natural prosody across its sentences — not
chopped sentence by sentence), and we record its start/end offset in the final
file so the reader can play one MP3 and highlight block by block in sync.

Usage:
  python3 scripts/gen-worldview-audio.py \
      --blocks database/seeds/orientalism/said-orientalism-ch1-s1.readingblocks.json \
      --voice  /tmp/piper_voices/ryan/en-us-ryan-high.onnx \
      --out    database/seeds/orientalism/audio/orientalism-ch1-s1
"""
import argparse, json, os, re, subprocess, wave
from piper import PiperVoice, SynthesisConfig

GAP_MS = 260       # natural pause inserted between blocks
CHUNK_CHARS = 320  # target chunk size: long blocks are split at sentence ends

# Abbreviations / decimals we must NOT treat as a sentence end when chunking.
_ABBR = re.compile(r'(^|\s)(?:mr|mrs|ms|dr|st|sr|jr|prof|fig|no|vol|pp|ed|al|etc|e\.g|i\.e|vs|ca)\.$', re.I)

def split_sentences(text):
    """Split into sentences without breaking on abbreviations or decimals."""
    out, buf = [], ""
    for raw in re.findall(r'[^.!?]+[.!?]*(?:\s+|$)', text) or [text]:
        p = raw.strip()
        if not p:
            continue
        buf = f"{buf} {p}".strip() if buf else p
        if not _ABBR.search(buf) and not re.search(r'\d\.$', buf):
            out.append(buf); buf = ""
    if buf:
        out.append(buf)
    return out

def chunk_text(text, limit=CHUNK_CHARS):
    """Group sentences into ~`limit`-char, properly punctuated chunks. Keeps
    multi-sentence prosody (fluent) while avoiding over-long inputs that make
    the model rush or flatten."""
    text = re.sub(r'\s+', ' ', text).strip()
    if not text:
        return []
    chunks, cur = [], ""
    for sent in split_sentences(text):
        if not re.search(r'[.!?…]$', sent):   # guarantee terminal punctuation
            sent += '.'
        if not cur:
            cur = sent
        elif len(cur) + 1 + len(sent) <= limit:
            cur = f"{cur} {sent}"
        else:
            chunks.append(cur); cur = sent
    if cur:
        chunks.append(cur)
    return chunks

def strip_md(t: str) -> str:
    if not t: return ""
    t = re.sub(r'\(\(\s*[\d–—-]+\s*\)\)', '', t)      # page anchors ((31))
    t = re.sub(r'`([^`]+)`', r'\1', t)
    t = re.sub(r'\[([^\]]+)\]\([^)]*\)', r'\1', t)
    t = re.sub(r'\*\*\*([^*]+)\*\*\*', r'\1', t)
    t = re.sub(r'\*\*([^*]+)\*\*', r'\1', t)
    t = re.sub(r'\*([^*]+)\*', r'\1', t)
    t = re.sub(r'_([^_]+)_', r'\1', t)
    t = re.sub(r'^#{1,6}\s+', '', t)
    t = t.replace('→', '. ').replace('—', ', ').replace('–', '-')
    t = re.sub(r'[#>`*_|]', '', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def block_text(block):
    """One fluent speech string for a reading block (or '' to skip)."""
    bt = block.get('type')
    if bt == 'separator':
        return ""
    if bt == 'list':
        parts = []
        for it in block.get('items', []):
            s = strip_md(it)
            if s: parts.append(s if re.search(r'[.!?]$', s) else s + '.')
        return ' '.join(parts)
    if bt == 'table':
        parts = []
        head = ', '.join(strip_md(c) for c in block.get('headerRow', []))
        if head: parts.append(head + '.')
        for row in block.get('rows', []):
            r = ', '.join(strip_md(c) for c in row)
            if r: parts.append(r + '.')
        return ' '.join(parts)
    s = strip_md(block.get('speech') or block.get('text') or '')
    if not s:
        return ""
    if bt in ('heading', 'subheading') and not re.search(r'[.!?]$', s):
        s += '.'
    return s

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--blocks', required=True)
    ap.add_argument('--voice', required=True)
    ap.add_argument('--out', required=True, help='output path prefix (no extension)')
    ap.add_argument('--ffmpeg', default=os.environ.get('FFMPEG', 'ffmpeg'))
    ap.add_argument('--speaker', type=int, default=0, help='speaker id (multi-speaker voices)')
    ap.add_argument('--length-scale', type=float, default=1.06, help='>1 = slower/warmer')
    ap.add_argument('--noise-scale', type=float, default=0.667)
    ap.add_argument('--noise-w', type=float, default=0.8, help='prosody variation (higher = more expressive)')
    ap.add_argument('--chunk-chars', type=int, default=CHUNK_CHARS)
    args = ap.parse_args()

    data = json.load(open(args.blocks))
    blocks = data['readingBlocks'] if isinstance(data, dict) else data

    spoken = [(i, block_text(b)) for i, b in enumerate(blocks)]
    spoken = [(i, t) for i, t in spoken if t]
    print(f"{len(spoken)} spoken blocks of {len(blocks)} total")

    voice = PiperVoice.load(args.voice, config_path=args.voice + '.json')
    syn = SynthesisConfig(
        speaker_id=args.speaker,
        length_scale=args.length_scale,
        noise_scale=args.noise_scale,
        noise_w_scale=args.noise_w,
    )
    rate = None
    pcm = bytearray()
    timings = []
    gap = b''

    for n, (block_index, text) in enumerate(spoken):
        start = len(pcm)
        # Chunk the block into properly-punctuated, sentence-grouped pieces so
        # each pass into the model is a natural length (no rushing), then
        # concatenate — the block still reads as one fluent unit.
        for chunk in chunk_text(text, args.chunk_chars):
            for ch in voice.synthesize(chunk, syn_config=syn):
                if rate is None:
                    rate = ch.sample_rate
                    gap = b'\x00\x00' * int(rate * GAP_MS / 1000)
                pcm.extend(ch.audio_int16_bytes)
        end = len(pcm)
        pcm.extend(gap)
        to_ms = lambda nbytes: round(nbytes / 2 / rate * 1000)
        timings.append({
            'blockIndex': block_index,
            'startMs': to_ms(start),
            'endMs': to_ms(end),
        })
        if n % 20 == 0:
            print(f"  {n}/{len(spoken)}  t={to_ms(end)/1000:.1f}s")

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    wav_path = args.out + '.wav'
    with wave.open(wav_path, 'wb') as wf:
        wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(rate)
        wf.writeframes(bytes(pcm))

    mp3_path = args.out + '.mp3'
    subprocess.run([args.ffmpeg, '-y', '-i', wav_path,
                    '-codec:a', 'libmp3lame', '-b:a', '64k', '-ar', '44100',
                    mp3_path], check=True, capture_output=True)
    os.remove(wav_path)

    total_ms = timings[-1]['endMs'] if timings else 0
    json.dump({
        'unit': os.path.basename(args.out),
        'voice': os.path.basename(args.voice),
        'durationMs': total_ms,
        'blocks': timings,
    }, open(args.out + '.timings.json', 'w'), ensure_ascii=False, indent=2)

    print(f"MP3:  {mp3_path}  ({os.path.getsize(mp3_path)//1024} KB, {total_ms/1000:.1f}s)")
    print(f"MAP:  {args.out}.timings.json  ({len(timings)} blocks)")

if __name__ == '__main__':
    main()
