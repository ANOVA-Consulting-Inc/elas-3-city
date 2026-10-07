import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
  type PDFFont,
  type PDFPage,
} from "@cantoo/pdf-lib";

export interface ParticipationPdfData {
  name: string;
  email: string;
  org: string;
  address: string;
  project: string;
  signature: string;
  ref: string;
  date: string; // YYYY-MM-DD
  ip?: string | null;
  userAgent?: string | null;
}

const CLAUSES: Array<{ title: string; body: string }> = [
  {
    title: "1. Definition of Confidential Information.",
    body: 'For purposes of this Agreement, "Confidential Information" shall include all information or material that has or could have commercial value, or other utility in the business in which the Disclosing Party is engaged. Written material shall be labelled or stamped "Confidential" (or similar). Oral disclosures shall be promptly confirmed in writing as constituting Confidential Information.',
  },
  {
    title: "2. Terms of Non-Disclosure.",
    body: "Either Party may disclose Confidential Information to the other in confidence, provided the disclosing Party identifies such information as proprietary and confidential (by marking, or, for oral disclosures or unmarked materials, by notifying the other Party orally, by e-mail, written correspondence or other appropriate means). Neither Party will, without prior approval of the other, make any public announcement of, or otherwise disclose the existence or terms of this Agreement.",
  },
  {
    title: "3. Obligations of Receiving Party.",
    body: "The Receiving Party shall hold and maintain the Confidential Information in strictest confidence, for the sole and exclusive benefit of the Disclosing Party. The Recipient shall ensure that each of its employees, officers, directors or agents with access to Confidential Information is informed of its proprietary and confidential nature and is required to abide by the terms of this Agreement. The Recipient shall promptly notify the Disclosing Party of any disclosure in violation of this Agreement, or of any subpoena or other legal process requiring production or disclosure of Confidential Information.",
  },
  {
    title: "4. Time Periods.",
    body: "When informed of the proprietary and confidential nature of Confidential Information disclosed by the other Party, the Receiving Party (\"Recipient\") shall, for a period of three (3) years from the date of the Recipient's end of contract, refrain from disclosing such Confidential Information to any contractor or other third party without prior written approval from the Disclosing Party, and shall protect such Confidential Information from inadvertent disclosure using the same care and diligence the Recipient uses to protect its own proprietary and confidential information, but in no case less than reasonable care. The non-disclosure provisions of this Agreement shall survive its termination, and the Receiving Party's duty to hold Confidential Information in confidence shall remain in effect until the Confidential Information no longer qualifies as a trade secret or until the Receiving Party sends the Disclosing Party written notice releasing it from this Agreement, whichever occurs first.",
  },
  {
    title: "5. Use of Intellectual Property.",
    body: "All Confidential Information disclosed under this Agreement shall be and remain the property of the Disclosing Party, and nothing in this Agreement shall be construed as granting any rights to such Confidential Information to the other Party. The Recipient shall honour any request to promptly return or destroy all copies of Confidential Information disclosed under this Agreement and all notes related thereto. The Parties agree that the Disclosing Party will suffer irreparable injury if its Confidential Information is made public, released to a third party, or otherwise disclosed in breach of this Agreement, and shall be entitled to obtain injunctive relief and an award of actual and exemplary damages from any court of competent jurisdiction.",
  },
  {
    title: "6. Relationships.",
    body: "This Agreement shall be deemed to constitute all parties as vendors Doing-Business-As their own legal business entity, and all parties will conduct the tasks stipulated under their respective statements of work (SOW) to completion or end of contract.",
  },
  {
    title: "7. Severability.",
    body: "If a court finds any provision of this Agreement invalid or unenforceable, the remainder of this Agreement shall be interpreted so as best to effect the intent of the parties.",
  },
  {
    title: "8. Agreement of Termination.",
    body: "This Agreement shall remain in effect for a period of three (3) years from the Effective Date unless otherwise terminated by either Party giving notice to the others of its desire to terminate this Agreement. The requirement to protect Confidential Information disclosed under this Agreement shall survive termination of this Agreement.",
  },
  {
    title: "9. Integration.",
    body: "This Agreement expresses the complete understanding of the parties with respect to the subject matter and supersedes all prior proposals, agreements, representations and understandings. This Agreement may not be amended except in a writing signed by ALL parties.",
  },
  {
    title: "10. Waiver.",
    body: "The failure to exercise any right provided in this Agreement shall not be a waiver of prior or subsequent rights. This Agreement and each party's obligations shall be binding on the representatives, assignees and successors of such party. Each party has signed this Agreement through its authorized representative.",
  },
  {
    title: "11. Jurisdiction.",
    body: "This Agreement shall be governed by the laws of the Republic of Barbados without regard to the conflict-of-laws provisions thereof.",
  },
  {
    title: "12. Electronic Signature.",
    body: "The parties agree that the typed signature(s) below constitute legally binding electronic signatures, equivalent to handwritten signatures, executed on the date set out above.",
  },
];

// Replace characters not encodable by WinAnsi (StandardFonts) with safe substitutes.
function sanitize(input: string): string {
  return (
    input
      .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
      .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/\u2026/g, "...")
      .replace(/\u00A0/g, " ")
      .replace(/[\u2022\u00B7]/g, "*")
      // eslint-disable-next-line no-control-regex
      .replace(/[^\x09\x0A\x0D\x20-\x7E\xA1-\xFF]/g, "?")
  );
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export async function buildParticipationPdf(d: ParticipationPdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`ELAS-3-CITY Participation - ${d.org} - ${d.ref}`);
  doc.setAuthor("ANOVA Consulting Inc.");
  doc.setSubject(`ELAS-3-CITY Participation for ${d.project}`);
  doc.setCreator("ELAS-3-CITY");

  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const mono = await doc.embedFont(StandardFonts.Courier);
  const sans = await doc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 64; // ~0.9in
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const BODY_SIZE = 10.5;
  const BODY_LH = 13.5;
  const H2_SIZE = 11;
  const TOP = PAGE_H - MARGIN;
  const BOTTOM = MARGIN;

  let page: PDFPage = doc.addPage([PAGE_W, PAGE_H]);
  let y = TOP;
  let pageNo = 1;

  const drawWatermark = (p: PDFPage) => {
    const wmText = sanitize(`ELAS-3-CITY · PARTICIPATION · ${d.name.toUpperCase()} · ${d.email}`);
    const wmSize = 7;
    const wmColor = rgb(0.55, 0.55, 0.55);
    // Diagonal watermark band across the page.
    for (let i = -2; i < 8; i++) {
      const x = MARGIN + i * 90;
      const y = PAGE_H - 60 - i * 55;
      p.drawText(wmText, {
        x,
        y,
        size: wmSize,
        font: mono,
        color: wmColor,
        rotate: degrees(-30),
      });
    }
  };

  const drawHeader = (p: PDFPage) => {
    p.drawText("ELAS-3-CITY", {
      x: MARGIN,
      y: PAGE_H - 40,
      size: 9,
      font: sans,
      color: rgb(0, 0, 0),
    });
    const stamp = "PARTICIPATION";
    const sw = mono.widthOfTextAtSize(stamp, 8.5);
    p.drawRectangle({
      x: PAGE_W - MARGIN - sw - 12,
      y: PAGE_H - 46,
      width: sw + 12,
      height: 16,
      borderColor: rgb(0.69, 0, 0),
      borderWidth: 1.2,
    });
    p.drawText(stamp, {
      x: PAGE_W - MARGIN - sw - 6,
      y: PAGE_H - 42,
      size: 8.5,
      font: mono,
      color: rgb(0.69, 0, 0),
    });
    p.drawLine({
      start: { x: MARGIN, y: PAGE_H - 52 },
      end: { x: PAGE_W - MARGIN, y: PAGE_H - 52 },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });
  };

  const drawFooter = (p: PDFPage, n: number) => {
    const txt = `${d.ref}  -  Printed ${new Date().toISOString()}  -  Page ${n}`;
    const w = mono.widthOfTextAtSize(txt, 8);
    p.drawText(txt, {
      x: (PAGE_W - w) / 2,
      y: 28,
      size: 8,
      font: mono,
      color: rgb(0.4, 0.4, 0.4),
    });
  };

  drawHeader(page);
  drawWatermark(page);
  y = PAGE_H - 70;

  const ensure = (needed: number) => {
    if (y - needed < BOTTOM + 20) {
      drawFooter(page, pageNo);
      pageNo += 1;
      page = doc.addPage([PAGE_W, PAGE_H]);
      drawHeader(page);
      drawWatermark(page);
      y = PAGE_H - 70;
    }
  };

  const drawParagraph = (text: string, font: PDFFont, size = BODY_SIZE, lh = BODY_LH) => {
    const lines = wrap(sanitize(text), font, size, CONTENT_W);
    for (const ln of lines) {
      ensure(lh);
      page.drawText(ln, { x: MARGIN, y, size, font, color: rgb(0.07, 0.07, 0.07) });
      y -= lh;
    }
  };

  // Title
  ensure(40);
  const title = "ELAS-3-CITY PARTICIPATION AGREEMENT";
  const tw = serifBold.widthOfTextAtSize(title, 16);
  page.drawText(title, { x: (PAGE_W - tw) / 2, y, size: 16, font: serifBold });
  y -= 22;

  const sub1 = "FOR SUSTAINABLE CONSUMPTION, PRODUCTION AND COMMUNITY VALUE";
  const sub2 = sanitize(d.project.toUpperCase());
  const s1w = mono.widthOfTextAtSize(sub1, 9.5);
  page.drawText(sub1, {
    x: (PAGE_W - s1w) / 2,
    y,
    size: 9.5,
    font: mono,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 12;
  for (const ln of wrap(sub2, mono, 9.5, CONTENT_W)) {
    const w = mono.widthOfTextAtSize(ln, 9.5);
    page.drawText(ln, { x: (PAGE_W - w) / 2, y, size: 9.5, font: mono, color: rgb(0.2, 0.2, 0.2) });
    y -= 12;
  }
  y -= 8;

  const refLine = `Reference: ${d.ref}    ·    Effective Date: ${d.date}`;
  page.drawText(sanitize(refLine), {
    x: MARGIN,
    y,
    size: 9,
    font: mono,
    color: rgb(0.33, 0.33, 0.33),
  });
  y -= 18;

  // Recitals
  drawParagraph(
    `This Participation Agreement (the "Agreement") is entered into, as of the last date signed below (the "Effective Date"), by and between ANOVA CONSULTING INC. of "Gladstone House" Pinfold Street, St. Michael, Barbados, BB1127 ("Disclosing Party A") and ${d.org} of ${d.address} ("Disclosing Party B"); for the purpose of preventing the unauthorized disclosure of confidential information, relating to the development of a strategic plan for management of ${d.project}, as defined below.`,
    serif,
  );
  y -= 4;
  drawParagraph(
    'Consequently, these Parties will also be identified as "Receiving Party A" and "Receiving Party B", respectively. The parties agree to enter into a confidential relationship with respect to the disclosure of certain proprietary and confidential information ("Confidential Information"), which may include each Party\'s: (1) business plans, methods and practices; (2) personnel, customers and suppliers; (3) inventions, processes, methods, products, patent applications and other proprietary rights; and (4) specifications, drawings, sketches, graphics, illustrations, models, samples, tools, computer programs, technical information or other related information.',
    serifItalic,
  );

  for (const c of CLAUSES) {
    y -= 6;
    ensure(H2_SIZE + 10);
    page.drawText(sanitize(c.title), { x: MARGIN, y, size: H2_SIZE, font: serifBold });
    y -= 14;
    drawParagraph(c.body, serif);
  }

  // Signature block — symmetrical four-row layout for both parties.
  y -= 16;
  ensure(200);
  page.drawText("IN WITNESS WHEREOF:", { x: MARGIN, y, size: 10, font: serifBold });
  y -= 24;

  const colW = (CONTENT_W - 32) / 2;
  const colAx = MARGIN;
  const colBx = MARGIN + colW + 32;

  // Per-column "Party A" / "Party B" header strip.
  page.drawText("DISCLOSING PARTY A  /  RECEIVING PARTY B", {
    x: colAx,
    y,
    size: 7.5,
    font: mono,
    color: rgb(0.35, 0.35, 0.35),
  });
  page.drawText("DISCLOSING PARTY B  /  RECEIVING PARTY A", {
    x: colBx,
    y,
    size: 7.5,
    font: mono,
    color: rgb(0.35, 0.35, 0.35),
  });
  y -= 18;

  type Row = {
    a: string;
    b: string;
    aFont: PDFFont;
    bFont: PDFFont;
    aSize: number;
    bSize: number;
    caption: string;
  };
  const rows: Row[] = [
    {
      a: "Adeyemi Gill",
      b: sanitize(d.signature),
      aFont: serifItalic,
      bFont: serifItalic,
      aSize: 16,
      bSize: 16,
      caption: "Signature",
    },
    {
      a: "ADEYEMI GILL",
      b: sanitize(d.name.toUpperCase()),
      aFont: serif,
      bFont: serif,
      aSize: 11,
      bSize: 11,
      caption: "Printed name",
    },
    {
      a: sanitize(d.date),
      b: sanitize(d.date),
      aFont: serif,
      bFont: serif,
      aSize: 11,
      bSize: 11,
      caption: "Date",
    },
    {
      a: "ANOVA CONSULTING INC.",
      b: sanitize(d.org.toUpperCase()),
      aFont: serif,
      bFont: serif,
      aSize: 11,
      bSize: 11,
      caption: "Organisation",
    },
  ];

  for (const r of rows) {
    ensure(40);
    page.drawText(r.a, { x: colAx, y, size: r.aSize, font: r.aFont });
    page.drawText(r.b, { x: colBx, y, size: r.bSize, font: r.bFont });
    page.drawLine({
      start: { x: colAx, y: y - 4 },
      end: { x: colAx + colW, y: y - 4 },
      thickness: 0.6,
    });
    page.drawLine({
      start: { x: colBx, y: y - 4 },
      end: { x: colBx + colW, y: y - 4 },
      thickness: 0.6,
    });
    page.drawText(r.caption, {
      x: colAx,
      y: y - 16,
      size: 7.5,
      font: mono,
      color: rgb(0.35, 0.35, 0.35),
    });
    page.drawText(r.caption, {
      x: colBx,
      y: y - 16,
      size: 7.5,
      font: mono,
      color: rgb(0.35, 0.35, 0.35),
    });
    y -= 36;
  }

  // Recipient contact footnote (Party B only).
  y -= 6;
  ensure(14);
  page.drawText(sanitize(`Recipient email: ${d.email}`), {
    x: colBx,
    y,
    size: 8,
    font: mono,
    color: rgb(0.35, 0.35, 0.35),
  });

  y -= 30;
  ensure(30);
  const meta = `Captured: ${new Date().toISOString()}  ·  IP: ${d.ip ?? "n/a"}  ·  UA: ${(d.userAgent ?? "n/a").slice(0, 90)}`;
  for (const ln of wrap(sanitize(meta), mono, 7.5, CONTENT_W)) {
    ensure(10);
    page.drawText(ln, { x: MARGIN, y, size: 7.5, font: mono, color: rgb(0.45, 0.45, 0.45) });
    y -= 10;
  }

  drawFooter(page, pageNo);

  return await doc.save();
}
