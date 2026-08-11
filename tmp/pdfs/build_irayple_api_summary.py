from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "output" / "pdf" / "irayple-api-web-integration-guide.pdf"
FONT = Path("C:/Windows/Fonts/tahoma.ttf")
FONT_BOLD = Path("C:/Windows/Fonts/tahomabd.ttf")


def register_fonts():
    pdfmetrics.registerFont(TTFont("Thai", str(FONT)))
    pdfmetrics.registerFont(TTFont("ThaiBold", str(FONT_BOLD)))


def style_sheet():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="DocTitle",
            fontName="ThaiBold",
            fontSize=22,
            leading=28,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#0F2E5F"),
            spaceAfter=10,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Subtitle",
            fontName="Thai",
            fontSize=12,
            leading=18,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#475467"),
            spaceAfter=14,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Section",
            fontName="ThaiBold",
            fontSize=15,
            leading=21,
            textColor=colors.HexColor("#0F2E5F"),
            spaceBefore=12,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BodyThai",
            fontName="Thai",
            fontSize=10.5,
            leading=16,
            alignment=TA_LEFT,
            textColor=colors.HexColor("#111827"),
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Small",
            fontName="Thai",
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#475467"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="CodeBlock",
            fontName="Courier",
            fontSize=8.3,
            leading=11,
            leftIndent=0,
            rightIndent=0,
            textColor=colors.HexColor("#101828"),
            backColor=colors.HexColor("#F7F9FC"),
            borderColor=colors.HexColor("#D0D5DD"),
            borderWidth=0.5,
            borderPadding=6,
            spaceBefore=4,
            spaceAfter=8,
        )
    )
    return styles


def p(text, styles, name="BodyThai"):
    return Paragraph(text, styles[name])


def code(text, styles):
    escaped = (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\n", "<br/>")
        .replace(" ", "&nbsp;")
    )
    return Paragraph(escaped, styles["CodeBlock"])


def table(rows, col_widths=None):
    data = []
    for row in rows:
        data.append([
            Paragraph(str(cell), ParagraphStyle(
                name="Cell",
                fontName="Thai",
                fontSize=9,
                leading=12,
                textColor=colors.HexColor("#111827"),
            ))
            for cell in row
        ])
    t = Table(data, colWidths=col_widths, hAlign="LEFT")
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EAF1FF")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0F2E5F")),
                ("FONTNAME", (0, 0), (-1, 0), "ThaiBold"),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D0D5DD")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return t


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Thai", 8)
    canvas.setFillColor(colors.HexColor("#667085"))
    canvas.drawString(18 * mm, 12 * mm, "IRAYPLE API Web Integration Guide")
    canvas.drawRightString(192 * mm, 12 * mm, f"Page {doc.page}")
    canvas.restoreState()


def build():
    register_fonts()
    styles = style_sheet()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=16 * mm,
        leftMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=18 * mm,
        title="IRAYPLE API Web Integration Guide",
        author="Codex",
    )

    story = []
    story.append(p("IRAYPLE API สำหรับสร้าง Web ควบคุมงานหุ่นยนต์", styles, "DocTitle"))
    story.append(
        p(
            "สรุป 4 API หลักที่ programmer ต้องใช้เพื่อสร้างงาน ยกเลิกงาน ดูสถานะหุ่น และติดตามว่างานเสร็จแล้วหรือยัง",
            styles,
            "Subtitle",
        )
    )

    story.append(p("ภาพรวมการทำงาน", styles, "Section"))
    story.append(
        p(
            "เอกสารนี้สรุปเฉพาะ API ที่จำเป็นสำหรับทำ Web Application พื้นฐานกับ RCS/ICS ของ IRAYPLE โดยใช้ HTTP + JSON เป็นหลัก ตัวอย่าง endpoint ใช้ base URL รูปแบบ <b>http://IP:7000</b> ให้เปลี่ยน IP ตามเครื่อง RCS หน้างาน",
            styles,
        )
    )
    story.append(
        table(
            [
                ["ขั้นตอน", "API ที่ใช้", "หน้าที่"],
                ["1", "Task delivery", "สร้างงานและส่งเส้นทางให้ RCS"],
                ["2", "Get task order status", "ตรวจว่างานยังวิ่งอยู่ หรือเสร็จแล้ว"],
                ["3", "Cancel task", "ยกเลิกงานที่ส่งเข้า RCS แล้ว"],
                ["4", "Device list/deviceInfo", "ดูสถานะหุ่น เช่น ว่าง วิ่งงาน ชาร์จ หรือ offline"],
            ],
            [20 * mm, 50 * mm, 100 * mm],
        )
    )
    story.append(Spacer(1, 5 * mm))
    story.append(
        p(
            "<b>คำแนะนำ:</b> ฝั่ง Web ควรมี orderId ของตัวเองและเก็บ history ไว้เสมอ เพราะ orderId คือ key สำคัญสำหรับ query สถานะและ cancel งาน",
            styles,
        )
    )

    story.append(p("Recommended Web Flow", styles, "Section"))
    story.append(
        table(
            [
                ["ลำดับ", "Web ทำอะไร", "รายละเอียดสำหรับ programmer"],
                ["1", "User เลือกหุ่น จุดต้นทาง จุดปลายทาง", "ตรวจว่า deviceNum, taskPath และ modelProcessCode ถูกต้อง"],
                ["2", "สร้าง orderId", "ควร unique เช่น timestamp + random หรือ UUID"],
                ["3", "เรียก addTask", "ถ้า code = 1000 ถือว่าส่งงานสำเร็จ"],
                ["4", "poll getTaskOrderStatus", "เช็กทุก 2-5 วินาทีจน status = 8"],
                ["5", "เมื่อ completed", "บันทึก history เป็น COMPLETED และปล่อย queue งานถัดไป"],
                ["6", "ถ้ายกเลิก", "ถ้ายังไม่ส่ง RCS ลบจาก queue ได้เลย ถ้าส่งแล้วให้เรียก cancelTask"],
            ],
            [18 * mm, 45 * mm, 107 * mm],
        )
    )

    story.append(PageBreak())
    story.append(p("API 1 - สร้างงาน: Task delivery", styles, "Section"))
    story.append(p("<b>Endpoint:</b> POST http://IP:7000/ics/taskOrder/addTask", styles))
    story.append(
        p(
            "ใช้สำหรับส่งงานจาก Web/WMS/MES เข้า RCS โดยระบุ task template, orderId, path และหุ่นที่ต้องการให้ทำงาน",
            styles,
        )
    )
    story.append(
        table(
            [
                ["Field", "Type", "Required", "คำอธิบาย"],
                ["modelProcessCode", "string", "yes", "รหัส task template/business process ที่ตั้งค่าใน RCS"],
                ["fromSystem", "string", "yes", "ชื่อระบบต้นทาง เช่น WMS, MES, TSC"],
                ["orderId", "string", "yes", "เลขงานจากระบบ Web ต้องไม่ซ้ำ"],
                ["taskOrderDetail[].taskPath", "string", "yes", "เส้นทางจุดงาน เช่น A1,B1 หรือ A1,B1,C1"],
                ["taskOrderDetail[].deviceNum", "string", "no", "เลขหุ่น/AMR ที่ต้องการ assign งาน"],
            ],
            [39 * mm, 25 * mm, 24 * mm, 82 * mm],
        )
    )
    story.append(code(
        """POST /ics/taskOrder/addTask
Content-Type: application/json

{
  "modelProcessCode": "FPTask",
  "fromSystem": "TSC",
  "orderId": "ORDER001",
  "taskOrderDetail": [
    {
      "taskPath": "A1,B1",
      "deviceNum": "FP001"
    }
  ]
}""",
        styles,
    ))
    story.append(code(
        """{
  "code": 1000,
  "data": "ORDER001",
  "desc": "Request successful"
}""",
        styles,
    ))
    story.append(
        p(
            "<b>การตีความ:</b> ถ้า code = 1000 แปลว่า RCS รับงานแล้ว แต่ยังไม่ได้แปลว่างานเสร็จ ต้องใช้ API getTaskOrderStatus เพื่อติดตามต่อ",
            styles,
        )
    )

    story.append(PageBreak())
    story.append(p("API 2 - ดูสถานะงาน: Query task status", styles, "Section"))
    story.append(p("<b>Endpoint:</b> POST http://IP:7000/ics/out/task/getTaskOrderStatus", styles))
    story.append(
        p(
            "ใช้ตรวจว่างานที่สร้างไปแล้วอยู่สถานะใด เหมาะสำหรับทำ queue เพราะ Web ต้องรองานแรก completed ก่อนส่งงานถัดไป",
            styles,
        )
    )
    story.append(code(
        """POST /ics/out/task/getTaskOrderStatus
Content-Type: application/json

{
  "orderId": "ORDER001"
}""",
        styles,
    ))
    story.append(
        table(
            [
                ["Status", "ความหมาย", "ควรทำอะไรใน Web"],
                ["6", "Running", "แสดงว่างานกำลังทำอยู่ และ poll ต่อ"],
                ["7", "Execution failed", "บันทึกล้มเหลว ตรวจ error/แจ้งผู้ใช้"],
                ["8", "Completed", "งานเสร็จแล้ว บันทึก history และเริ่มงานถัดไปใน queue"],
                ["9", "Issued", "งานถูกออกคำสั่งแล้ว รอทำงานหรือกำลังจะเริ่ม"],
                ["10", "Wait for confirmation", "งานรอ confirm ตาม template ของ RCS"],
            ],
            [22 * mm, 54 * mm, 94 * mm],
        )
    )
    story.append(code(
        """{
  "code": 1000,
  "data": {
    "areaId": 1,
    "createTime": 1684920666,
    "fromSystem": "TSC",
    "status": 8,
    "taskOrderDetail": [
      {
        "deviceNum": "FP001",
        "qrContent": "B1",
        "time": 1684920709,
        "status": "8",
        "subTaskStatus": 3
      }
    ]
  },
  "desc": "Request successful"
}""",
        styles,
    ))
    story.append(
        p(
            "<b>หมายเหตุเรื่องเวลา:</b> เอกสารไม่มี field ชื่อ endTime โดยตรง แต่ taskOrderDetail[].time เป็นเวลาสถานะล่าสุดจาก RCS สามารถใช้ประกอบกับเวลาที่ Web ได้รับ status = 8 เพื่อบันทึก finishedAt ได้",
            styles,
        )
    )

    story.append(PageBreak())
    story.append(p("API 3 - ยกเลิกงาน: Cancel task", styles, "Section"))
    story.append(p("<b>Endpoint:</b> POST http://IP:7000/ics/out/task/cancelTask", styles))
    story.append(
        p(
            "ใช้ยกเลิกงานที่ส่งเข้า RCS แล้ว ถ้างานยังอยู่ใน queue ของ Web และยังไม่ถูกส่งเข้า RCS สามารถลบจาก queue ภายใน Web ได้โดยไม่ต้องเรียก API นี้",
            styles,
        )
    )
    story.append(
        table(
            [
                ["Field", "Type", "Required", "คำอธิบาย"],
                ["orderId", "string", "yes", "เลขงานที่ต้องการยกเลิก"],
                ["destPosition", "string", "conditional", "จุดปลายทางหลัง cancel ถ้าหน้างานต้องการระบุ"],
            ],
            [38 * mm, 26 * mm, 30 * mm, 76 * mm],
        )
    )
    story.append(code(
        """POST /ics/out/task/cancelTask
Content-Type: application/json

[
  {
    "orderId": "ORDER001",
    "destPosition": "B1"
  }
]""",
        styles,
    ))
    story.append(code(
        """{
  "code": 1000,
  "desc": "success"
}""",
        styles,
    ))
    story.append(
        p(
            "<b>แนวทางทำปุ่ม Cancel:</b> ถ้า status ใน Web เป็น QUEUED หรือ DELAYING ให้ cancel ใน Web ได้เลย ถ้า status เป็น RUNNING/ISSUED/SENDING ให้เรียก cancelTask ไปที่ RCS ก่อน แล้วค่อยเปลี่ยน history เป็น CANCELLED",
            styles,
        )
    )

    story.append(p("API 4 - ดูสถานะหุ่น: Device info", styles, "Section"))
    story.append(p("<b>Endpoint:</b> POST http://IP:7000/ics/out/device/list/deviceInfo", styles))
    story.append(
        p(
            "ใช้ดูสถานะหุ่น เช่น offline, idle, fault, on mission, charging และตำแหน่งปัจจุบันของหุ่น เหมาะสำหรับหน้า Robot Status หรือหน้าเลือกหุ่นก่อน assign งาน",
            styles,
        )
    )
    story.append(code(
        """POST /ics/out/device/list/deviceInfo
Content-Type: application/json

{
  "areaId": "1",
  "deviceType": 0,
  "deviceCode": "FP001"
}""",
        styles,
    ))
    story.append(
        table(
            [
                ["deviceStatus", "ความหมาย", "คำแนะนำใน Web"],
                ["0", "Offline", "ไม่ควรให้สั่งงาน"],
                ["1", "Idle / Free", "พร้อมรับงาน"],
                ["2", "Fault", "แจ้ง alarm และไม่ควรให้สั่งงาน"],
                ["3", "Initializing", "รอหุ่นพร้อม"],
                ["4", "On mission", "กำลังทำงาน"],
                ["5", "Charging", "กำลังชาร์จ ไม่ควรให้สั่งงาน"],
                ["7", "Upgrading", "กำลังอัปเกรด ไม่ควรให้สั่งงาน"],
            ],
            [28 * mm, 50 * mm, 92 * mm],
        )
    )
    story.append(code(
        """{
  "code": 1000,
  "data": [
    {
      "deviceCode": "FP001",
      "deviceName": "FP150",
      "deviceStatus": 1,
      "battery": 86,
      "devicePosition": "A1",
      "state": "Idle"
    }
  ],
  "desc": "success"
}""",
        styles,
    ))

    story.append(PageBreak())
    story.append(p("ตัวอย่าง logic สำหรับ Queue ใน Web", styles, "Section"))
    story.append(
        p(
            "ถ้าระบบต้องการให้ RCS รับงานทีละงาน ให้ Web เป็นคนคุม queue เอง โดยยังไม่ส่งงานที่ 2 จนกว่างานที่ 1 จะ completed",
            styles,
        )
    )
    story.append(code(
        """// pseudo code
async function processQueue(robotId) {
  const current = getCurrentRunningTask(robotId);
  if (current) return;

  const next = getNextQueuedTask(robotId);
  if (!next) return;

  if (next.delaySeconds > 0) {
    markStatus(next.orderId, "DELAYING");
    await wait(next.delaySeconds);
  }

  markStatus(next.orderId, "SENDING");
  const sendResult = await addTask(next);

  if (sendResult.code !== 1000) {
    markStatus(next.orderId, "FAILED");
    return processQueue(robotId);
  }

  markStatus(next.orderId, "RUNNING");

  while (true) {
    const status = await getTaskOrderStatus(next.orderId);
    if (status.data.status === 8) {
      markStatus(next.orderId, "COMPLETED");
      return processQueue(robotId);
    }
    await wait(2000);
  }
}""",
        styles,
    ))
    story.append(
        p(
            "<b>สถานะที่แนะนำใน Web:</b> QUEUED, DELAYING, SENDING, RUNNING, COMPLETED, CANCELLED, FAILED",
            styles,
        )
    )

    story.append(p("Checklist ก่อนส่งมอบให้ programmer", styles, "Section"))
    story.append(
        table(
            [
                ["หัวข้อ", "ต้องเตรียมอะไร"],
                ["Base URL", "IP และ port ของ RCS เช่น http://192.168.8.100:7000"],
                ["modelProcessCode", "รหัส template ที่ตั้งค่าไว้ใน RCS"],
                ["deviceNum", "เลขหุ่นจริงที่ RCS ใช้รับงาน"],
                ["จุดงาน", "ชื่อจุดใน taskPath ต้องตรงกับ map/RCS"],
                ["orderId", "ต้อง unique และเก็บไว้ใช้ query/cancel"],
                ["polling interval", "แนะนำ 2-5 วินาที"],
                ["cancel policy", "ตกลงกับหน้างานว่าหลัง cancel ให้หุ่นไปจุดใด"],
            ],
            [45 * mm, 125 * mm],
        )
    )

    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print(OUTPUT)


if __name__ == "__main__":
    build()
