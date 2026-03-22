"""
Credify PDF Report Generator — Professional Analytical Report Builder

Generates polished, data-rich PDF reports using reportlab.
Supports both fact-check and AI-detection report types.
All layout is programmatic — no HTML-to-PDF conversion.
"""

import os
from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle,
    KeepTogether, PageBreak, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY


try:
    from svglib.svglib import svg2rlg
except ImportError:
    svg2rlg = None


# ─── Brand Constants ───────────────────────────────────────────────────────────
BRAND_PRIMARY = colors.HexColor('#03A9F4')       # Credify blue
BRAND_PRIMARY_DARK = colors.HexColor('#0288D1')
BRAND_ACCENT = colors.HexColor('#00BCD4')
BRAND_BG_DARK = colors.HexColor('#0f172a')        # Dark navy header
BRAND_BG_SECTION = colors.HexColor('#f8fafc')     # Light section bg
BRAND_BORDER = colors.HexColor('#e2e8f0')
BRAND_TEXT_PRIMARY = colors.HexColor('#0f172a')
BRAND_TEXT_SECONDARY = colors.HexColor('#475569')
BRAND_TEXT_TERTIARY = colors.HexColor('#94a3b8')

VERDICT_COLORS = {
    'TRUE': colors.HexColor('#16a34a'),
    'FALSE': colors.HexColor('#dc2626'),
    'MISLEADING': colors.HexColor('#dc2626'),
    'PARTIAL': colors.HexColor('#f59e0b'),
    'UNCERTAIN': colors.HexColor('#f59e0b'),
    'CONFLICT': colors.HexColor('#ea580c'),
    'UNVERIFIED': colors.HexColor('#6b7280'),
}

VERDICT_BG_COLORS = {
    'TRUE': colors.HexColor('#f0fdf4'),
    'FALSE': colors.HexColor('#fef2f2'),
    'MISLEADING': colors.HexColor('#fef2f2'),
    'PARTIAL': colors.HexColor('#fffbeb'),
    'UNCERTAIN': colors.HexColor('#fffbeb'),
    'CONFLICT': colors.HexColor('#fff7ed'),
    'UNVERIFIED': colors.HexColor('#f9fafb'),
}

PAGE_WIDTH, PAGE_HEIGHT = letter
MARGIN_LEFT = 50
MARGIN_RIGHT = 50
CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT

LOGO_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "CredifyIcon.svg"))


# ─── Custom Styles ─────────────────────────────────────────────────────────────
def _get_styles():
    """Create the full set of paragraph styles used throughout the report."""
    base = getSampleStyleSheet()

    styles = {
        'report_title': ParagraphStyle(
            'ReportTitle', parent=base['Heading1'],
            fontSize=26, leading=32, spaceAfter=4,
            textColor=colors.white, alignment=TA_LEFT,
            fontName='Helvetica-Bold',
        ),
        'report_subtitle': ParagraphStyle(
            'ReportSubtitle', parent=base['Normal'],
            fontSize=11, leading=14, spaceAfter=0,
            textColor=colors.HexColor('#90caf9'), alignment=TA_LEFT,
        ),
        'section_heading': ParagraphStyle(
            'SectionHeading', parent=base['Heading2'],
            fontSize=15, leading=20, spaceBefore=18, spaceAfter=8,
            textColor=BRAND_PRIMARY_DARK, fontName='Helvetica-Bold',
            borderPadding=(0, 0, 4, 0),
        ),
        'subsection_heading': ParagraphStyle(
            'SubsectionHeading', parent=base['Heading3'],
            fontSize=12, leading=16, spaceBefore=12, spaceAfter=6,
            textColor=BRAND_TEXT_PRIMARY, fontName='Helvetica-Bold',
        ),
        'body': ParagraphStyle(
            'Body', parent=base['Normal'],
            fontSize=10, leading=15, spaceAfter=6,
            textColor=BRAND_TEXT_SECONDARY, alignment=TA_JUSTIFY,
        ),
        'body_bold': ParagraphStyle(
            'BodyBold', parent=base['Normal'],
            fontSize=10, leading=15, spaceAfter=6,
            textColor=BRAND_TEXT_PRIMARY, fontName='Helvetica-Bold',
        ),
        'small': ParagraphStyle(
            'Small', parent=base['Normal'],
            fontSize=8, leading=11, spaceAfter=4,
            textColor=BRAND_TEXT_TERTIARY,
        ),
        'label': ParagraphStyle(
            'Label', parent=base['Normal'],
            fontSize=8, leading=10, spaceAfter=2,
            textColor=BRAND_TEXT_TERTIARY, fontName='Helvetica',
        ),
        'value': ParagraphStyle(
            'Value', parent=base['Normal'],
            fontSize=11, leading=14, spaceAfter=2,
            textColor=BRAND_TEXT_PRIMARY, fontName='Helvetica-Bold',
        ),
        'verdict_large': ParagraphStyle(
            'VerdictLarge', parent=base['Normal'],
            fontSize=18, leading=22, spaceAfter=2,
            fontName='Helvetica-Bold', alignment=TA_CENTER,
        ),
        'link': ParagraphStyle(
            'Link', parent=base['Normal'],
            fontSize=9, leading=13, spaceAfter=4,
            textColor=BRAND_PRIMARY,
        ),
        'executive_body': ParagraphStyle(
            'ExecutiveBody', parent=base['Normal'],
            fontSize=11, leading=17, spaceAfter=8,
            textColor=BRAND_TEXT_SECONDARY, alignment=TA_JUSTIFY,
        ),
        'disclaimer': ParagraphStyle(
            'Disclaimer', parent=base['Normal'],
            fontSize=7.5, leading=10, spaceAfter=0,
            textColor=BRAND_TEXT_TERTIARY, alignment=TA_CENTER,
        ),
        'table_header': ParagraphStyle(
            'TableHeader', parent=base['Normal'],
            fontSize=8, leading=11, textColor=colors.white,
            fontName='Helvetica-Bold', alignment=TA_LEFT,
        ),
        'table_cell': ParagraphStyle(
            'TableCell', parent=base['Normal'],
            fontSize=9, leading=13, textColor=BRAND_TEXT_SECONDARY,
            alignment=TA_LEFT,
        ),
        'table_cell_bold': ParagraphStyle(
            'TableCellBold', parent=base['Normal'],
            fontSize=9, leading=13, textColor=BRAND_TEXT_PRIMARY,
            fontName='Helvetica-Bold', alignment=TA_LEFT,
        ),
    }
    return styles


# ─── Reusable Drawing Components ──────────────────────────────────────────────

def _section_divider():
    """A thin branded horizontal line to separate sections."""
    return HRFlowable(
        width="100%", thickness=1, lineCap='round',
        color=BRAND_BORDER, spaceBefore=6, spaceAfter=10,
    )


def _section_heading_with_number(styles, number, title):
    """Section heading formatted as:  SECTION TITLE"""
    text = title.upper()
    return Paragraph(text, styles['section_heading'])


def _kv_row(styles, label, value, value_color=None):
    """A key-value pair displayed as a mini row."""
    color_attr = f' color="{value_color}"' if value_color else ''
    text = f'<font size="8" color="{BRAND_TEXT_TERTIARY.hexval()}">{label}:</font>&nbsp;&nbsp;<font size="10"{color_attr}><b>{_safe(value)}</b></font>'
    return Paragraph(text, styles['body'])


def _stat_card_table(styles, stats, col_count=3):
    """
    Creates a grid of stat cards.
    stats: list of (label, value, color_hex_string)
    """
    rows = []
    current_row = []
    for i, (label, value, color) in enumerate(stats):
        cell_content = [
            Paragraph(f'<font size="8" color="{BRAND_TEXT_TERTIARY.hexval()}">{label}</font>', styles['label']),
            Paragraph(f'<font size="14" color="{color}"><b>{value}</b></font>', styles['value']),
        ]
        current_row.append(cell_content)
        if len(current_row) == col_count:
            rows.append(current_row)
            current_row = []
    if current_row:
        while len(current_row) < col_count:
            current_row.append([''])
        rows.append(current_row)

    if not rows:
        return Spacer(1, 1)

    col_width = CONTENT_WIDTH / col_count
    table = Table(rows, colWidths=[col_width] * col_count)
    table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('BOX', (0, 0), (-1, -1), 0.5, BRAND_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BRAND_BORDER),
        ('BACKGROUND', (0, 0), (-1, -1), BRAND_BG_SECTION),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
    ]))
    return table


def _safe(val, default='N/A'):
    """Safely convert a value to string, handling None and empty."""
    if val is None or val == '':
        return default
    return str(val)


def _safe_float(val, default=0.0):
    """Safely convert to float."""
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


def _truncate(text, max_len=500):
    """Truncate long text with ellipsis."""
    if not text:
        return ''
    text = str(text)
    if len(text) > max_len:
        return text[:max_len] + '…'
    return text


def _format_confidence(conf):
    """Format confidence as percentage string."""
    try:
        val = float(conf)
        if val <= 1.0:
            return f"{val * 100:.1f}%"
        return f"{val:.1f}%"
    except (TypeError, ValueError):
        return 'N/A'


def _verdict_color_hex(verdict):
    """Get verdict color as hex string."""
    v = str(verdict).upper()
    c = VERDICT_COLORS.get(v, colors.HexColor('#6b7280'))
    return c.hexval()


# ─── Page Template (Header & Footer) ───────────────────────────────────────────

def _draw_header_footer(canvas, doc):
    """Draw branded header bar and footer on every page."""
    canvas.saveState()
    page_w, page_h = letter

    # ── Footer ──
    footer_y = 25
    canvas.setStrokeColor(BRAND_BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN_LEFT, footer_y + 14, page_w - MARGIN_RIGHT, footer_y + 14)

    canvas.setFont('Helvetica', 7)
    canvas.setFillColor(BRAND_TEXT_TERTIARY)
    canvas.drawString(MARGIN_LEFT, footer_y, f"Generated by Credify  ·  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    canvas.drawRightString(page_w - MARGIN_RIGHT, footer_y, f"Page {doc.page}")

    # ── Subtle top-right branding on continuation pages ──
    if doc.page > 1:
        canvas.setFont('Helvetica-Bold', 8)
        canvas.setFillColor(BRAND_PRIMARY)
        canvas.drawRightString(page_w - MARGIN_RIGHT, page_h - 30, "CREDIFY REPORT")
        canvas.setStrokeColor(BRAND_PRIMARY)
        canvas.setLineWidth(1.5)
        canvas.line(page_w - MARGIN_RIGHT - 80, page_h - 33, page_w - MARGIN_RIGHT, page_h - 33)

    canvas.restoreState()


# ─── Title Page / Header Block ─────────────────────────────────────────────────

def _build_title_block(elements, styles, report_data):
    """Build the branded title block at the top of page 1."""
    # Dark header background as a table with dark bg
    report_type = report_data.get('report_type', 'fact_check')
    type_label = 'Fact-Check Analysis Report' if report_type == 'fact_check' else 'AI Content Detection Report'

    # Build logo + title row
    logo_cell = ''
    if os.path.exists(LOGO_PATH) and svg2rlg is not None:
        try:
            drawing = svg2rlg(LOGO_PATH)
            if drawing:
                scale = 2.0
                drawing.width *= scale
                drawing.height *= scale
                drawing.scale(scale, scale)
                logo_cell = drawing
        except Exception:
            pass

    title_content = [
        Paragraph("CREDIFY", ParagraphStyle(
            'BrandName', fontSize=22, leading=26,
            textColor=colors.white, fontName='Helvetica-Bold',
        )),
        Spacer(1, 2),
        Paragraph(type_label, ParagraphStyle(
            'TypeLabel', fontSize=11, leading=14,
            textColor=colors.HexColor('#90caf9'),
        )),
        Spacer(1, 6),
        Paragraph(
            f"Generated on {datetime.now().strftime('%B %d, %Y at %H:%M:%S')}",
            ParagraphStyle('DateLabel', fontSize=8, leading=11, textColor=colors.HexColor('#64b5f6')),
        ),
    ]

    if logo_cell:
        header_data = [[logo_cell, title_content]]
        header_table = Table(header_data, colWidths=[60, CONTENT_WIDTH - 60])
    else:
        header_data = [[title_content]]
        header_table = Table(header_data, colWidths=[CONTENT_WIDTH])

    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BRAND_BG_DARK),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 16),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 16),
        ('LEFTPADDING', (0, 0), (-1, -1), 18),
        ('RIGHTPADDING', (0, 0), (-1, -1), 18),
        ('ROUNDEDCORNERS', [6, 6, 6, 6]),
    ]))

    elements.append(header_table)
    elements.append(Spacer(1, 16))


# ─── Executive Summary ────────────────────────────────────────────────────────

def _build_executive_summary(elements, styles, report_data):
    """Build the executive summary section."""
    elements.append(_section_heading_with_number(styles, 1, 'Executive Summary'))
    elements.append(_section_divider())

    report_type = report_data.get('report_type', 'fact_check')

    if report_type == 'ai_detection':
        _build_ai_executive_summary(elements, styles, report_data)
    else:
        _build_factcheck_executive_summary(elements, styles, report_data)


def _build_factcheck_executive_summary(elements, styles, report_data):
    """Executive summary for fact-check reports."""
    claims = report_data.get('claims', [])
    total = len(claims)
    completed = [c for c in claims if c.get('status') == 'Completed']

    true_count = sum(1 for c in completed if str(c.get('verdict', '')).upper() == 'TRUE')
    false_count = sum(1 for c in completed if str(c.get('verdict', '')).upper() in ['FALSE', 'MISLEADING'])
    partial_count = sum(1 for c in completed if str(c.get('verdict', '')).upper() in ['PARTIAL', 'UNCERTAIN', 'CONFLICT'])
    unverified_count = total - true_count - false_count - partial_count

    # Determine overall verdict
    if total == 0:
        overall = 'NO CLAIMS FOUND'
        overall_color = BRAND_TEXT_TERTIARY.hexval()
    elif false_count > true_count:
        overall = 'MOSTLY FALSE'
        overall_color = VERDICT_COLORS['FALSE'].hexval()
    elif true_count > false_count and partial_count == 0:
        overall = 'VERIFIED TRUE'
        overall_color = VERDICT_COLORS['TRUE'].hexval()
    elif true_count > 0 and false_count == 0:
        overall = 'MOSTLY TRUE'
        overall_color = VERDICT_COLORS['TRUE'].hexval()
    elif partial_count > 0:
        overall = 'MIXED RESULTS'
        overall_color = VERDICT_COLORS['PARTIAL'].hexval()
    else:
        overall = 'UNDER REVIEW'
        overall_color = BRAND_TEXT_TERTIARY.hexval()

    # Calculate average confidence
    confidences = []
    for c in completed:
        conf = c.get('confidence', c.get('confidence_score'))
        if conf is not None:
            val = _safe_float(conf)
            confidences.append(val if val <= 1.0 else val / 100.0)
    avg_conf = (sum(confidences) / len(confidences) * 100) if confidences else 0

    # Verdict card
    verdict_content = [
        [
            Paragraph(f'<font color="{BRAND_TEXT_TERTIARY.hexval()}" size="8">OVERALL VERDICT</font>', styles['label']),
            Paragraph(f'<font color="{BRAND_TEXT_TERTIARY.hexval()}" size="8">CONFIDENCE</font>', styles['label']),
            Paragraph(f'<font color="{BRAND_TEXT_TERTIARY.hexval()}" size="8">CLAIMS ANALYZED</font>', styles['label']),
        ],
        [
            Paragraph(f'<font color="{overall_color}" size="16"><b>{overall}</b></font>', styles['value']),
            Paragraph(f'<font color="{BRAND_PRIMARY.hexval()}" size="16"><b>{avg_conf:.0f}%</b></font>', styles['value']),
            Paragraph(f'<font size="16"><b>{total}</b></font>', styles['value']),
        ],
    ]
    verdict_table = Table(verdict_content, colWidths=[CONTENT_WIDTH * 0.4, CONTENT_WIDTH * 0.3, CONTENT_WIDTH * 0.3])
    verdict_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('BACKGROUND', (0, 0), (-1, -1), BRAND_BG_SECTION),
        ('BOX', (0, 0), (-1, -1), 0.5, BRAND_BORDER),
        ('LINEBELOW', (0, 0), (-1, 0), 0, colors.transparent),  # no line after labels
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
    ]))
    elements.append(verdict_table)
    elements.append(Spacer(1, 10))

    # Key takeaway
    summary_texts = [c.get('summary', '') for c in completed if c.get('summary')]
    if summary_texts:
        takeaway = summary_texts[0]
        if len(summary_texts) > 1:
            takeaway = f"Analysis of {total} claim(s) revealed {true_count} verified true, {false_count} false/misleading, and {partial_count} partially verified or uncertain. " + summary_texts[0]
        elements.append(Paragraph(f'<b>Key Takeaway:</b> {_safe(_truncate(takeaway, 600))}', styles['executive_body']))

    # Breakdown stats
    stats = [
        ('Verified True', str(true_count), VERDICT_COLORS['TRUE'].hexval()),
        ('False / Misleading', str(false_count), VERDICT_COLORS['FALSE'].hexval()),
        ('Partial / Uncertain', str(partial_count), VERDICT_COLORS['PARTIAL'].hexval()),
    ]
    if unverified_count > 0:
        stats.append(('Unverified', str(unverified_count), BRAND_TEXT_TERTIARY.hexval()))

    elements.append(_stat_card_table(styles, stats, col_count=min(len(stats), 4)))
    elements.append(Spacer(1, 8))

    # AI detection info if available at task level
    ai_detection = report_data.get('ai_detection') or report_data.get('ai_result')
    if ai_detection and not ai_detection.get('skipped', False):
        human_score = _safe_float(ai_detection.get('human_score', 100))
        ai_score = _safe_float(ai_detection.get('ai_score', 0))
        label = 'Likely Human' if human_score >= 80 else ('Mixed Signals' if human_score >= 50 else 'AI-Generated')
        label_color = VERDICT_COLORS['TRUE'].hexval() if human_score >= 80 else (VERDICT_COLORS['PARTIAL'].hexval() if human_score >= 50 else VERDICT_COLORS['FALSE'].hexval())
        elements.append(Paragraph(
            f'<font size="8" color="{BRAND_TEXT_TERTIARY.hexval()}">AI CONTENT DETECTION:</font>&nbsp;&nbsp;'
            f'<font color="{label_color}"><b>{label}</b></font>&nbsp;&nbsp;'
            f'<font size="9" color="{BRAND_TEXT_SECONDARY.hexval()}">(Human: {human_score:.0f}%  ·  AI: {ai_score:.0f}%)</font>',
            styles['body']
        ))
        elements.append(Spacer(1, 4))


def _build_ai_executive_summary(elements, styles, report_data):
    """Executive summary for AI detection reports."""
    ai_data = report_data.get('result') or report_data.get('ai_detection') or report_data.get('ai_result') or {}

    human_score = _safe_float(ai_data.get('human_score', 0))
    ai_score = _safe_float(ai_data.get('ai_score', 0))
    readability = _safe_float(ai_data.get('readability_score', 0))
    language = ai_data.get('language', 'unknown')

    # Determine band
    if human_score >= 80:
        band_label = 'LIKELY HUMAN-WRITTEN'
        band_color = VERDICT_COLORS['TRUE'].hexval()
        band_desc = 'No strong indicators of synthetic or AI-generated content were found in the analyzed text.'
    elif human_score >= 50:
        band_label = 'MIXED SIGNALS'
        band_color = VERDICT_COLORS['PARTIAL'].hexval()
        band_desc = 'AI-like patterns were detected. The text shows characteristics of both human and AI writing.'
    else:
        band_label = 'AI-GENERATED CONTENT'
        band_color = VERDICT_COLORS['FALSE'].hexval()
        band_desc = 'This text was likely written or significantly assisted by an AI model.'

    # Verdict card
    verdict_content = [
        [
            Paragraph(f'<font color="{BRAND_TEXT_TERTIARY.hexval()}" size="8">DETECTION VERDICT</font>', styles['label']),
            Paragraph(f'<font color="{BRAND_TEXT_TERTIARY.hexval()}" size="8">HUMAN SCORE</font>', styles['label']),
            Paragraph(f'<font color="{BRAND_TEXT_TERTIARY.hexval()}" size="8">AI SCORE</font>', styles['label']),
        ],
        [
            Paragraph(f'<font color="{band_color}" size="14"><b>{band_label}</b></font>', styles['value']),
            Paragraph(f'<font color="{VERDICT_COLORS["TRUE"].hexval()}" size="16"><b>{human_score:.1f}%</b></font>', styles['value']),
            Paragraph(f'<font color="{VERDICT_COLORS["FALSE"].hexval()}" size="16"><b>{ai_score:.1f}%</b></font>', styles['value']),
        ],
    ]
    verdict_table = Table(verdict_content, colWidths=[CONTENT_WIDTH * 0.4, CONTENT_WIDTH * 0.3, CONTENT_WIDTH * 0.3])
    verdict_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('BACKGROUND', (0, 0), (-1, -1), BRAND_BG_SECTION),
        ('BOX', (0, 0), (-1, -1), 0.5, BRAND_BORDER),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
    ]))
    elements.append(verdict_table)
    elements.append(Spacer(1, 8))

    elements.append(Paragraph(f'<b>Assessment:</b> {band_desc}', styles['executive_body']))

    # Stats
    stats = [
        ('Human Score', f'{human_score:.1f}%', VERDICT_COLORS['TRUE'].hexval()),
        ('AI Score', f'{ai_score:.1f}%', VERDICT_COLORS['FALSE'].hexval()),
        ('Readability', f'{readability:.0f}', BRAND_PRIMARY.hexval()),
    ]
    if language and language != 'unknown':
        stats.append(('Language', language.upper(), BRAND_TEXT_SECONDARY.hexval()))

    elements.append(_stat_card_table(styles, stats, col_count=min(len(stats), 4)))
    elements.append(Spacer(1, 4))


# ─── Input Details ─────────────────────────────────────────────────────────────

def _build_input_details(elements, styles, report_data):
    """Build the input details section."""
    elements.append(_section_heading_with_number(styles, 2, 'Input Details'))
    elements.append(_section_divider())

    input_type = str(report_data.get('input_type', 'text')).upper()
    original_input = report_data.get('original_input', report_data.get('input_data', ''))
    text = report_data.get('text', report_data.get('extracted_text', ''))

    elements.append(_kv_row(styles, 'Input Type', input_type))

    if input_type == 'URL' and original_input:
        url_display = _truncate(str(original_input), 100)
        link_text = f'<a href="{_safe(original_input)}" color="{BRAND_PRIMARY.hexval()}">{_safe(url_display)}</a>'
        elements.append(Paragraph(
            f'<font size="8" color="{BRAND_TEXT_TERTIARY.hexval()}">Source URL:</font>&nbsp;&nbsp;{link_text}',
            styles['body']
        ))
    elif input_type == 'IMAGE' and original_input:
        # Try to embed the image
        img_path = os.path.join(os.path.dirname(__file__), "..", "uploads", str(original_input))
        if os.path.exists(img_path):
            try:
                from PIL import Image as PILImage
                with PILImage.open(img_path) as pil_img:
                    w, h = pil_img.size
                max_w, max_h = 300, 250
                if w > max_w or h > max_h:
                    ratio = min(max_w / w, max_h / h)
                    w, h = int(w * ratio), int(h * ratio)
                elements.append(Spacer(1, 6))
                elements.append(Image(img_path, width=w, height=h))
                elements.append(Spacer(1, 6))
            except Exception:
                elements.append(Paragraph(
                    '<i>Image could not be embedded in the report.</i>', styles['small']
                ))

    # Display user text content
    display_text = text or original_input or ''
    if display_text:
        if input_type == 'TEXT':
            label = 'User Input'
        elif input_type in ['URL', 'IMAGE']:
            label = 'Extracted Content'
        else:
            label = 'Analyzed Text'
        elements.append(Spacer(1, 4))
        elements.append(Paragraph(f'<b>{label}:</b>', styles['body_bold']))

        # Content box with background
        content_text = _truncate(str(display_text), 800)
        text_para = Paragraph(_safe(content_text), ParagraphStyle(
            'ContentBox', parent=styles['body'],
            fontSize=9, leading=14, textColor=BRAND_TEXT_SECONDARY,
        ))
        content_table = Table([[text_para]], colWidths=[CONTENT_WIDTH - 20])
        content_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), BRAND_BG_SECTION),
            ('BOX', (0, 0), (-1, -1), 0.5, BRAND_BORDER),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('ROUNDEDCORNERS', [3, 3, 3, 3]),
        ]))
        elements.append(content_table)

    elements.append(Spacer(1, 6))


# ─── Analysis Results (Fact Check) ─────────────────────────────────────────────

def _build_claims_verdicts(elements, styles, report_data):
    """Build the claims and verdicts section with table layout."""
    claims = report_data.get('claims', [])
    if not claims:
        return

    elements.append(_section_heading_with_number(styles, 3, 'Claims & Verdicts'))
    elements.append(_section_divider())

    # Summary table header
    header_row = [
        Paragraph('#', styles['table_header']),
        Paragraph('CLAIM', styles['table_header']),
        Paragraph('VERDICT', styles['table_header']),
        Paragraph('CONFIDENCE', styles['table_header']),
    ]

    table_data = [header_row]

    for idx, claim in enumerate(claims, start=1):
        claim_text = _truncate(str(claim.get('claim', 'Unknown claim')), 200)
        verdict = str(claim.get('verdict', 'UNVERIFIED')).upper()
        confidence = claim.get('confidence', claim.get('confidence_score'))
        conf_str = _format_confidence(confidence)
        v_color = _verdict_color_hex(verdict)

        row = [
            Paragraph(f'<b>{idx}</b>', styles['table_cell_bold']),
            Paragraph(_safe(claim_text), styles['table_cell']),
            Paragraph(f'<font color="{v_color}"><b>{verdict}</b></font>', styles['table_cell_bold']),
            Paragraph(f'<b>{conf_str}</b>', styles['table_cell_bold']),
        ]
        table_data.append(row)

    col_widths = [30, CONTENT_WIDTH - 200, 90, 80]
    claims_table = Table(table_data, colWidths=col_widths, repeatRows=1)
    claims_table.setStyle(TableStyle([
        # Header style
        ('BACKGROUND', (0, 0), (-1, 0), BRAND_PRIMARY_DARK),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        # Body
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BRAND_BG_SECTION]),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('BOX', (0, 0), (-1, -1), 0.5, BRAND_BORDER),
        ('LINEBELOW', (0, 0), (-1, 0), 1, BRAND_PRIMARY),
        ('INNERGRID', (0, 1), (-1, -1), 0.25, BRAND_BORDER),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
    ]))
    elements.append(claims_table)
    elements.append(Spacer(1, 12))


# ─── Detailed Claim Breakdown ─────────────────────────────────────────────────

def _build_detailed_breakdown(elements, styles, report_data):
    """Build detailed per-claim analysis sections."""
    claims = report_data.get('claims', [])
    completed_claims = [c for c in claims if c.get('verdict')]

    if not completed_claims:
        return

    elements.append(PageBreak())
    elements.append(_section_heading_with_number(styles, 4, 'Detailed Analysis'))
    elements.append(_section_divider())

    for idx, claim in enumerate(completed_claims, start=1):
        claim_text = str(claim.get('claim', 'Unknown claim'))
        verdict = str(claim.get('verdict', 'UNVERIFIED')).upper()
        confidence = claim.get('confidence', claim.get('confidence_score'))
        conf_str = _format_confidence(confidence)
        v_color = _verdict_color_hex(verdict)
        v_bg = VERDICT_BG_COLORS.get(verdict, BRAND_BG_SECTION)

        # Claim header card
        claim_header_content = [
            Paragraph(f'<font size="9" color="{BRAND_TEXT_TERTIARY.hexval()}">CLAIM {idx}</font>', styles['label']),
            Paragraph(f'<b>{_safe(claim_text)}</b>', ParagraphStyle(
                'ClaimText', parent=styles['body'], fontSize=10, leading=15,
                textColor=BRAND_TEXT_PRIMARY, fontName='Helvetica-Bold',
            )),
        ]

        verdict_badge_content = [
            Paragraph(f'<font size="8" color="{BRAND_TEXT_TERTIARY.hexval()}">VERDICT</font>', styles['label']),
            Paragraph(f'<font color="{v_color}" size="13"><b>{verdict}</b></font>', styles['value']),
            Paragraph(f'<font size="8" color="{BRAND_TEXT_TERTIARY.hexval()}">Confidence: </font><b>{conf_str}</b>', styles['small']),
        ]

        header_table = Table(
            [[claim_header_content, verdict_badge_content]],
            colWidths=[CONTENT_WIDTH * 0.65, CONTENT_WIDTH * 0.35]
        )
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), BRAND_BG_SECTION),
            ('BACKGROUND', (1, 0), (1, 0), v_bg),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('BOX', (0, 0), (-1, -1), 0.5, BRAND_BORDER),
            ('LINEBETWEEN', (0, 0), (-1, -1), 0.5, BRAND_BORDER),
            ('ROUNDEDCORNERS', [4, 4, 4, 4]),
        ]))

        elements.append(KeepTogether([header_table]))
        elements.append(Spacer(1, 6))

        # Reasoning
        reasoning = claim.get('reasoning', '')
        if reasoning:
            elements.append(Paragraph('<b>Reasoning:</b>', styles['body_bold']))
            elements.append(Paragraph(_safe(_truncate(str(reasoning), 600)), styles['body']))

        # Summary
        summary = claim.get('summary', '')
        if summary:
            elements.append(Paragraph('<b>Summary:</b>', styles['body_bold']))
            elements.append(Paragraph(_safe(_truncate(str(summary), 600)), styles['body']))

        # Key Points
        key_points = claim.get('key_points', [])
        if key_points:
            elements.append(Paragraph('<b>Key Points:</b>', styles['body_bold']))
            for point in key_points[:6]:
                elements.append(Paragraph(f'•&nbsp;&nbsp;{_safe(str(point))}', styles['body']))

        # Evidence / Sources
        sources = claim.get('streaming_sources', claim.get('key_evidence', []))
        if sources:
            elements.append(Spacer(1, 4))
            elements.append(Paragraph('<b>Evidence Sources:</b>', styles['body_bold']))
            _build_evidence_table(elements, styles, sources)

        elements.append(Spacer(1, 16))


# ─── Evidence Table ────────────────────────────────────────────────────────────

def _build_evidence_table(elements, styles, sources):
    """Build a professional evidence table."""
    if not sources:
        return

    header = [
        Paragraph('SOURCE', styles['table_header']),
        Paragraph('CREDIBILITY', styles['table_header']),
        Paragraph('DETAILS', styles['table_header']),
    ]
    table_data = [header]

    for src in sources[:10]:  # Limit to 10 sources
        source_name = src.get('source', src.get('title', 'Unknown'))
        url = src.get('url', '')
        cred_score = _safe_float(src.get('credibility_score', 0))
        snippet = _truncate(str(src.get('snippet', src.get('content', ''))), 150)
        author = src.get('author', '')
        published = src.get('published_at', '')
        tld = src.get('tld', '')
        is_https = src.get('is_https', False)

        # Source cell with clickable link
        source_parts = [Paragraph(f'<b>{_safe(_truncate(str(source_name), 60))}</b>', styles['table_cell_bold'])]
        if url:
            url_display = _truncate(str(url), 50)
            source_parts.append(Paragraph(
                f'<a href="{_safe(url)}" color="{BRAND_PRIMARY.hexval()}">{_safe(url_display)}</a>',
                ParagraphStyle('LinkSmall', parent=styles['table_cell'], fontSize=7, textColor=BRAND_PRIMARY)
            ))

        # Credibility cell
        cred_pct = f"{cred_score * 100:.0f}%" if cred_score <= 1 else f"{cred_score:.0f}%"
        cred_color = VERDICT_COLORS['TRUE'].hexval() if cred_score >= 0.7 else (
            VERDICT_COLORS['PARTIAL'].hexval() if cred_score >= 0.4 else VERDICT_COLORS['FALSE'].hexval()
        )
        cred_parts = [Paragraph(f'<font color="{cred_color}" size="10"><b>{cred_pct}</b></font>', styles['table_cell_bold'])]

        # Details cell
        detail_parts = []
        if snippet:
            detail_parts.append(Paragraph(f'<i>{_safe(snippet)}</i>', ParagraphStyle(
                'SnippetStyle', parent=styles['table_cell'], fontSize=8, textColor=BRAND_TEXT_TERTIARY,
            )))
        meta_items = []
        if author:
            meta_items.append(f'By: {_safe(_truncate(str(author), 30))}')
        if tld:
            meta_items.append(f'TLD: {tld}')
        if is_https:
            meta_items.append('HTTPS ✓')
        if published:
            meta_items.append(f'Published: {_safe(_truncate(str(published), 20))}')
        if meta_items:
            detail_parts.append(Paragraph(
                '&nbsp;&nbsp;·&nbsp;&nbsp;'.join(meta_items),
                ParagraphStyle('MetaStyle', parent=styles['table_cell'], fontSize=7, textColor=BRAND_TEXT_TERTIARY)
            ))

        table_data.append([source_parts, cred_parts, detail_parts or [Paragraph('—', styles['table_cell'])]])

    evidence_table = Table(
        table_data,
        colWidths=[CONTENT_WIDTH * 0.35, CONTENT_WIDTH * 0.15, CONTENT_WIDTH * 0.50],
        repeatRows=1,
    )
    evidence_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BRAND_BG_DARK),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BRAND_BG_SECTION]),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('BOX', (0, 0), (-1, -1), 0.5, BRAND_BORDER),
        ('INNERGRID', (0, 1), (-1, -1), 0.25, BRAND_BORDER),
        ('LINEBELOW', (0, 0), (-1, 0), 1, BRAND_PRIMARY),
    ]))
    elements.append(evidence_table)


# ─── AI Detection Details ─────────────────────────────────────────────────────

def _build_ai_detection_details(elements, styles, report_data):
    """Build detailed AI detection results."""
    ai_data = report_data.get('result') or report_data.get('ai_detection') or report_data.get('ai_result') or {}

    if not ai_data:
        return

    if ai_data.get('skipped', False):
        elements.append(_section_heading_with_number(styles, 3, 'Detection Results'))
        elements.append(_section_divider())
        skip_reason = ai_data.get('skip_reason', 'Detection was skipped due to insufficient or invalid input.')
        elements.append(Paragraph(f'<i>Detection Skipped: {_safe(str(skip_reason))}</i>', styles['body']))
        return

    elements.append(_section_heading_with_number(styles, 3, 'Detection Analysis'))
    elements.append(_section_divider())

    human_score = _safe_float(ai_data.get('human_score', 0))
    ai_score = _safe_float(ai_data.get('ai_score', 0))
    readability = _safe_float(ai_data.get('readability_score', 0))

    # Score distribution visualization
    elements.append(Paragraph('<b>Score Distribution:</b>', styles['body_bold']))
    elements.append(Spacer(1, 4))

    # Build a simple bar representation using table
    bar_width = CONTENT_WIDTH - 40
    human_bar_width = max(2, (human_score / 100.0) * bar_width)

    # Human bar
    human_label = Paragraph(
        f'<font color="{VERDICT_COLORS["TRUE"].hexval()}" size="9"><b>Human: {human_score:.1f}%</b></font>',
        styles['body']
    )
    ai_label = Paragraph(
        f'<font color="{VERDICT_COLORS["FALSE"].hexval()}" size="9"><b>AI: {ai_score:.1f}%</b></font>',
        styles['body']
    )

    bar_data = [[human_label, ai_label]]
    bar_table = Table(bar_data, colWidths=[CONTENT_WIDTH * 0.5, CONTENT_WIDTH * 0.5])
    bar_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    elements.append(bar_table)
    elements.append(Spacer(1, 6))

    # Detailed metrics
    version = ai_data.get('version', '')
    credits_used = ai_data.get('credits_used', 0)
    credits_remaining = ai_data.get('credits_remaining', 0)

    detail_stats = [
        ('Readability Score', f'{readability:.0f}', BRAND_PRIMARY.hexval()),
        ('Human Probability', f'{human_score:.1f}%', VERDICT_COLORS['TRUE'].hexval()),
        ('AI Probability', f'{ai_score:.1f}%', VERDICT_COLORS['FALSE'].hexval()),
    ]
    elements.append(_stat_card_table(styles, detail_stats, col_count=3))
    elements.append(Spacer(1, 8))

    # Attack detection
    attacks = ai_data.get('attack_detected', {})
    has_attacks = False
    if isinstance(attacks, dict):
        has_attacks = attacks.get('zero_width_space', False) or attacks.get('homoglyph_attack', False)

    if has_attacks:
        elements.append(Spacer(1, 6))
        elements.append(Paragraph(
            f'<font color="{VERDICT_COLORS["FALSE"].hexval()}"><b>⚠ Manipulation Attacks Detected</b></font>',
            styles['body_bold']
        ))
        if attacks.get('zero_width_space'):
            elements.append(Paragraph(
                '•&nbsp;&nbsp;Zero-width space characters — invisible characters inserted to confuse detection systems.',
                styles['body']
            ))
        if attacks.get('homoglyph_attack'):
            elements.append(Paragraph(
                '•&nbsp;&nbsp;Homoglyph substitution — visually identical spoof characters replacing standard ones.',
                styles['body']
            ))
        elements.append(Spacer(1, 6))


# ─── Technical Details ─────────────────────────────────────────────────────────

def _build_technical_details(elements, styles, report_data):
    """Build optional technical details section."""
    report_type = report_data.get('report_type', 'fact_check')

    # Collect available technical metadata
    tech_items = []

    created_at = report_data.get('created_at', '')
    if created_at:
        tech_items.append(('Task Created', str(created_at)))

    task_id = report_data.get('task_id', '')
    if task_id:
        tech_items.append(('Task ID', str(task_id)))

    source_type = report_data.get('source_type', report_data.get('input_type', ''))
    if source_type:
        tech_items.append(('Source Type', str(source_type).upper()))

    status = report_data.get('status', '')
    if status:
        tech_items.append(('Task Status', str(status)))

    # AI detection technical info
    ai_data = report_data.get('ai_detection') or report_data.get('ai_result') or report_data.get('result') or {}
    if ai_data:
        version = ai_data.get('version', '')
        if version:
            tech_items.append(('Detection Model Version', str(version)))
        credits_used = ai_data.get('credits_used')
        if credits_used is not None:
            tech_items.append(('API Credits Used', str(credits_used)))
        credits_remaining = ai_data.get('credits_remaining')
        if credits_remaining is not None:
            tech_items.append(('API Credits Remaining', str(credits_remaining)))

    if not tech_items:
        return

    elements.append(Spacer(1, 6))

    # Only add page break if we have claims (long report)
    claims = report_data.get('claims', [])
    if len(claims) > 2:
        elements.append(PageBreak())

    section_num = 5 if report_type == 'fact_check' else 4
    elements.append(_section_heading_with_number(styles, section_num, 'Technical Details'))
    elements.append(_section_divider())

    elements.append(Paragraph(
        '<i>Processing metadata and pipeline information for reference.</i>',
        styles['small']
    ))
    elements.append(Spacer(1, 6))

    # Build a clean key-value table
    tech_table_data = []
    for label, value in tech_items:
        tech_table_data.append([
            Paragraph(f'<b>{_safe(label)}</b>', ParagraphStyle(
                'TechLabel', parent=styles['table_cell'], fontSize=8,
                textColor=BRAND_TEXT_SECONDARY, fontName='Helvetica-Bold',
            )),
            Paragraph(_safe(value), ParagraphStyle(
                'TechValue', parent=styles['table_cell'], fontSize=8,
                textColor=BRAND_TEXT_PRIMARY,
            )),
        ])

    if tech_table_data:
        tech_table = Table(tech_table_data, colWidths=[CONTENT_WIDTH * 0.35, CONTENT_WIDTH * 0.65])
        tech_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('BACKGROUND', (0, 0), (0, -1), BRAND_BG_SECTION),
            ('BOX', (0, 0), (-1, -1), 0.5, BRAND_BORDER),
            ('INNERGRID', (0, 0), (-1, -1), 0.25, BRAND_BORDER),
            ('ROUNDEDCORNERS', [3, 3, 3, 3]),
        ]))
        elements.append(tech_table)

    # Pipeline steps for fact-check
    if report_type == 'fact_check':
        elements.append(Spacer(1, 10))
        elements.append(Paragraph('<b>Analysis Pipeline:</b>', styles['body_bold']))
        pipeline_steps = [
            ('Claim Extraction', 'Parsed input to extract verifiable factual statements'),
            ('Evidence Retrieval', 'Searched trusted data sources for relevant evidence'),
            ('Credibility Scoring', 'Multi-dimensional credibility assessment (domain trust, freshness, agreement, etc.)'),
            ('Claim Verification', 'Evaluated claims against scored evidence'),
            ('Verdict Computation', 'Synthesized final assessment with confidence scoring'),
            ('Summary Generation', 'Generated human-readable explanation of results'),
        ]
        for step_name, step_desc in pipeline_steps:
            elements.append(Paragraph(
                f'•&nbsp;&nbsp;<b>{step_name}</b>&nbsp;&nbsp;—&nbsp;&nbsp;{step_desc}',
                styles['body']
            ))


# ─── Disclaimer Footer ────────────────────────────────────────────────────────

def _build_disclaimer(elements, styles):
    """Add the final disclaimer section."""
    elements.append(Spacer(1, 20))
    elements.append(HRFlowable(
        width="60%", thickness=0.5, lineCap='round',
        color=BRAND_BORDER, spaceBefore=8, spaceAfter=8,
    ))
    elements.append(Paragraph(
        'This report was generated by Credify — an AI-powered fact-checking and content analysis platform.',
        styles['disclaimer']
    ))
    elements.append(Paragraph(
        'Results are based on automated analysis pipelines. Verification by human experts is '
        'recommended for critical decisions. Evidence credibility scores are computed using '
        'multi-dimensional scoring including domain trust, temporal freshness, cross-source '
        'agreement, and content quality metrics.',
        styles['disclaimer']
    ))
    elements.append(Spacer(1, 4))
    elements.append(Paragraph(
        f'© {datetime.now().year} Credify  ·  All rights reserved  ·  '
        f'Report generated on {datetime.now().strftime("%Y-%m-%d at %H:%M:%S")}',
        styles['disclaimer']
    ))


# ─── Main Builder ──────────────────────────────────────────────────────────────

def build_pdf_report(report_data: dict) -> BytesIO:
    """
    Build a professional PDF report from the given data.

    Args:
        report_data: Dictionary containing all analysis data.
            Expected keys vary by report_type:
            - 'report_type': 'fact_check' | 'ai_detection'
            - 'claims': list of claim dicts (fact_check)
            - 'result' or 'ai_detection': AI detection result dict
            - 'text': analyzed text
            - 'input_type': 'text' | 'url' | 'image'
            - 'original_input': original user input
            + various other fields

    Returns:
        BytesIO buffer containing the PDF.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=MARGIN_RIGHT,
        leftMargin=MARGIN_LEFT,
        topMargin=40,
        bottomMargin=45,
    )

    styles = _get_styles()
    elements = []

    report_type = report_data.get('report_type', 'fact_check')

    # ── 1. Title Block ──
    _build_title_block(elements, styles, report_data)

    # ── 2. Executive Summary ──
    _build_executive_summary(elements, styles, report_data)

    # ── 3. Input Details ──
    _build_input_details(elements, styles, report_data)

    # ── 4. Main Analysis ──
    if report_type == 'ai_detection':
        _build_ai_detection_details(elements, styles, report_data)
    else:
        # Fact-check: claims table + detailed breakdown
        _build_claims_verdicts(elements, styles, report_data)
        _build_detailed_breakdown(elements, styles, report_data)

    # ── 5. Disclaimer ──
    _build_disclaimer(elements, styles)

    # Build with branded header/footer
    doc.build(elements, onFirstPage=_draw_header_footer, onLaterPages=_draw_header_footer)
    buffer.seek(0)
    return buffer
