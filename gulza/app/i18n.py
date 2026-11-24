"""Localized browser editions. Japanese (the source) and English (app/english.py) are the originals; the Chinese,
Indonesian, Korean, and Vietnamese editions use the same glossary keys as English, with values in their own module (app/i18n_<code>.py):
BODY / UI / EXPORT (Japanese phrase -> translation), STYLES {key: (name, description)}, MOODS {key: name},
SAMPLE (sample lyrics), TITLE, DESCRIPTION. Effect part names start from the English labels (app/english.js) and are
replaced by each edition's part-name script (COMMUNITY / PART_NAMES below)."""
import importlib, json

# code, output folder, html lang, native name
EDITIONS = [
    ('ko', '', 'ko', '한국어'),
    ('ja', 'ja', 'ja', '日本語'),
    ('en', 'en', 'en', 'English'),
    ('zh-Hant', 'zh-hant', 'zh-Hant', '繁體中文'),
    ('zh-Hans', 'zh-hans', 'zh-Hans', '简体中文'),
    ('id', 'id', 'id-ID', 'Bahasa Indonesia'),
    ('vi', 'vi', 'vi', 'Tiếng Việt'),
]
MODULES = {
    'zh-Hant': 'app.i18n_zh_hant', 'zh-Hans': 'app.i18n_zh_hans',
    'ko': 'app.i18n_ko', 'id': 'app.i18n_id', 'vi': 'app.i18n_vi',
}
# community translations (PR #6 by Zaious, PR #8 by andongmin94): their glossary wins over app/i18n_<code>.py, which
# only fills strings added later; their label scripts name every part, style and mood (after app/english.js)
COMMUNITY = {'zh-Hant': ('app.chinese', 'app/chinese.js'), 'ko': ('app.korean', 'app/korean.js')}
# part-name scripts for editions without a community glossary (after app/english.js and the edition's own names)
PART_NAMES = {'zh-Hans': 'app/chinese_hans.js', 'id': 'app/indonesian.js', 'vi': 'app/vietnamese.js'}
BASE = 'https://ruruoni1.github.io/gulza/'


def site_links(code):
    """Project and creator links in the toolbar, translated per edition."""
    label, channel = {
        'ko': ('관련 링크', '고버스TV · YouTube'),
        'ja': ('関連リンク', 'GoverseTV · YouTube'),
        'en': ('Related links', 'GoverseTV · YouTube'),
        'zh-Hant': ('相關連結', 'GoverseTV · YouTube'),
        'zh-Hans': ('相关链接', 'GoverseTV · YouTube'),
        'id': ('Tautan terkait', 'GoverseTV · YouTube'),
        'vi': ('Liên kết liên quan', 'GoverseTV · YouTube'),
    }[code]
    return (f'<nav class="site-links" aria-label="{label}">'
            '<a href="https://github.com/ruruoni1/gulza" target="_blank" rel="noopener noreferrer">GitHub <span aria-hidden="true">↗</span></a>'
            f'<a href="https://www.youtube.com/@goverse82" target="_blank" rel="noopener noreferrer">{channel} <span aria-hidden="true">↗</span></a>'
            '</nav>')

# The four lines are the first video a visitor sees in each browser edition.
# Keep the meaning consistent while making the wording natural in each language.
DEMO_LYRICS = {
    'ko': 'GULZA는 한국어 *글자*에서 왔어요\n글자 하나가/움직이기 시작하면\n자막이 장면이 되고\n당신의 말이 영상이 됩니다!',
    'ja': 'GULZAは韓国語の*글자*（文字）から\nひと文字が/動き出すと\n字幕がひとつのシーンになり\nあなたの言葉が映像になる!',
    'en': 'GULZA comes from Korean *글자* (“letters”)\nWhen one letter/starts to move\nSubtitles become a scene\nYour words become a video!',
    'zh-Hant': 'GULZA 源自韓語 *글자*（文字）\n當一個字/開始動起來\n字幕就成了畫面\n你的話語成為影片！',
    'zh-Hans': 'GULZA 源自韩语 *글자*（文字）\n当一个字/开始动起来\n字幕就成了画面\n你的话语成为视频！',
    'id': 'GULZA berasal dari bahasa Korea *글자* (“huruf”)\nSaat satu huruf/mulai bergerak\nTakarir menjadi sebuah adegan\nKata-katamu menjadi video!',
    'vi': 'GULZA bắt nguồn từ tiếng Hàn *글자* (“chữ viết”)\nKhi một con chữ/bắt đầu chuyển động\nPhụ đề trở thành một cảnh phim\nLời bạn hóa thành video!',
}

# Recognize only untouched lyric examples saved by earlier releases. Edited
# projects remain in the user's chosen language when they switch the UI.
OLD_DEMO_LYRICS = [
    'GULZAは韓国語の*글자*から\n意味は「文字」\nひと文字が/動き出すと\n言葉が映像になる!',
    'GULZA comes from the Korean word *글자*\nIt means “letters”\nWhen a letter/starts to move\nYour words become a video!',
    'GULZA 來自韓語 *글자*\n意思是「文字」\n一個字/開始動起來\n你的話語就成了影片！',
    'GULZA 来自韩语 *글자*\n意思是“文字”\n一个字/开始动起来\n你的话语就成了视频！',
    'GULZA berasal dari kata Korea *글자*\nArtinya “huruf”\nSaat satu huruf/mulai bergerak\nKata-katamu menjadi video!',
    'GULZA bắt nguồn từ tiếng Hàn *글자*\nNghĩa là “chữ viết”\nKhi một con chữ/bắt đầu chuyển động\nLời bạn hóa thành video!',
    '夜明けの色を/覚えてる\nほどけた声が遠くで鳴った\nねえ、まだ間に合うかな\n*透明*なままじゃ終われない!',
    '새벽의 색을/기억하고 있어\n멀리서 풀려 버린 목소리\n있잖아, 아직 늦지 않았을까\n*투명*한 채로 끝낼 수는 없어!',
    'I remember/the color of dawn\nA voice faded into the distance\nCan we still make it in time?\n*Transparent* is not how this ends!',
    '晚風把影子/拉成一條線\n口袋裡還藏著沒寄出的信\n喂，現在追上去還來得及嗎\n*微光*也要燒到最後!',
] + [importlib.import_module(name).SAMPLE for name in MODULES.values()]


def demo_js(code):
    """Install the locale's demo last, after community translation scripts."""
    return ('J.SAMPLE_LYRICS = ' + json.dumps(DEMO_LYRICS[code], ensure_ascii=False) + ';\n'
            'J.DEMO_LYRICS = ' + json.dumps(list(dict.fromkeys(OLD_DEMO_LYRICS + list(DEMO_LYRICS.values()))), ensure_ascii=False) + ';\n')


class _Merged:
    def __init__(self, base, over):
        for k in dir(base):
            if not k.startswith('_'): setattr(self, k, getattr(base, k))
        for sec in ('BODY', 'UI', 'EXPORT'):
            merged = dict(getattr(base, sec)); merged.update(getattr(over, sec, {}))
            setattr(self, sec, merged)


_cache = {}
def module(code):
    if code not in MODULES: return None
    if code not in _cache:
        base = importlib.import_module(MODULES[code])
        _cache[code] = _Merged(base, importlib.import_module(COMMUNITY[code][0])) if code in COMMUNITY else base
    return _cache[code]


def labels_js(code):
    """the label scripts injected before the editor starts: English part names, this edition's names, community labels"""
    out = names_js(code)
    if code in COMMUNITY: out += '\n' + open(COMMUNITY[code][1], encoding='utf-8').read()
    if code in PART_NAMES: out += '\n' + open(PART_NAMES[code], encoding='utf-8').read()
    return out


def replace_copy(source, glossary):
    # longest first protects complete phrases from shorter label replacements
    for japanese, local in sorted(glossary.items(), key=lambda pair: -len(pair[0])):
        source = source.replace(japanese, local)
    return source


def localize_body(code, source):
    return replace_copy(source, module(code).BODY)


def localize_js(code, source, filename):
    m = module(code)
    if filename.endswith('12_ui.js'):
        return replace_copy(source, m.UI)
    if filename.endswith('11_export.js'):
        return replace_copy(source, m.EXPORT)
    return source


def names_js(code):
    """styles / moods / sample lyrics in the edition's language (after app/english.js, which names the parts)"""
    m = module(code)
    labels = getattr(m, 'LANG_LABELS', None)
    label_js = ('  Object.assign(J.LANG_LABEL, ' + json.dumps(labels, ensure_ascii=False) + ');\n') if labels else ''
    return ('(() => {\n' + label_js + '  const S = ' + json.dumps({k: list(v) for k, v in m.STYLES.items()}, ensure_ascii=False) + ';\n'
            '  for (const [k, [n, d]] of Object.entries(S)) if (J.STYLES[k]) { J.STYLES[k].name = n; J.STYLES[k].desc = d; }\n'
            '  const M = ' + json.dumps(m.MOODS, ensure_ascii=False) + ';\n'
            '  for (const [k, n] of Object.entries(M)) if (J.MOODS[k]) J.MOODS[k].name = n;\n'
            '  J.SAMPLE_LYRICS = ' + json.dumps(m.SAMPLE, ensure_ascii=False) + ';\n'
            '})();\n')


def nav(code):
    """language menu (a select, so the editions fit the header), links relative to the edition's folder"""
    if len(EDITIONS) < 2:
        return ''
    here = dict((c, f) for c, f, _, _ in EDITIONS)[code]
    up = '../' if here else ''
    opts = []
    for c, folder, hl, name in EDITIONS:
        href = up + (folder + '/' if folder else '') + 'index.html'
        opts.append(f'<option value="{href}" lang="{hl}"{" selected" if c == code else ""}>{name}</option>')
    label = {
        'ko': '화면 언어', 'ja': '画面の言語', 'en': 'Interface language',
        'zh-Hant': '介面語言', 'zh-Hans': '界面语言',
        'id': 'Bahasa antarmuka', 'vi': 'Ngôn ngữ giao diện',
    }[code]
    return (f'<label class="lang-switch" title="{label}"><span class="lang-icon" aria-hidden="true">🌐</span>'
            '<span class="lang-label" aria-hidden="true">LN</span>'
            f'<select aria-label="{label}" onchange="if(this.value)location.href=this.value">'
            + ''.join(opts) + '</select></label>')


def has_module(code):
    try:
        module(code); return True
    except ModuleNotFoundError:
        return False
