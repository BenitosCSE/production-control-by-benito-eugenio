import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { EquipmentItem, RepairRecord, WorkDayLog, SalarySettings, InventoryAct, WarehouseItem } from '../types';

// Helper to render HTML element into PDF file
async function generatePdfFromHtml(container: HTMLElement, filename: string) {
  // Temporarily attach to body hidden
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = '800px';
  container.style.background = '#ffffff';
  container.style.color = '#000000';
  container.style.fontFamily = 'Inter, Arial, sans-serif';
  container.style.padding = '32px';
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}

// 1. Зведений Акт виконаних робіт, видачі розхідників та регламентних робіт
export async function downloadRepairActPDF(
  equipment: EquipmentItem,
  repair?: RepairRecord,
  warehouse: WarehouseItem[] = []
) {
  const container = document.createElement('div');
  container.className = 'pdf-render-box';
  
  const todayStr = new Date().toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedDate = repair
    ? new Date(repair.date).toLocaleDateString('uk-UA', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : todayStr;

  // Filter issued consumables / needles for this machine
  const machineIssuedMovements = warehouse.flatMap((wh) =>
    wh.movements
      .filter(
        (m) =>
          m.equipmentId === equipment.id ||
          (m.note && m.note.includes(equipment.nomenclatureNumber))
      )
      .map((m) => ({
        ...m,
        itemName: wh.name,
        category: wh.category,
        unit: wh.unit,
      }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  container.innerHTML = `
    <div style="font-family: Arial, sans-serif; font-size: 12px; color: #111; line-height: 1.4;">
      {/* Header */}
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 16px;">
        <div>
          <h2 style="margin: 0; font-size: 18px; font-weight: bold; text-transform: uppercase; color: #000;">
            ${repair ? 'АКТ ВИКОНАНИХ РЕМОНТНИХ РОБІТ ТА ОБСЛУГОВУВАННЯ' : 'ПАСПОРТ ТА ЗВІТ ОБСЛУГОВУВАННЯ ТЕХНІКИ'}
          </h2>
          <p style="margin: 3px 0 0 0; color: #555; font-size: 11px;">Швейне виробництво • Benito Eugenio</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; font-weight: bold; font-size: 13px;">
            № ${repair ? `ACT-R-${repair.id.slice(-5).toUpperCase()}` : `PASSPORT-${equipment.nomenclatureNumber}`}
          </p>
          <p style="margin: 3px 0 0 0; color: #555;">Дата формування: ${formattedDate}</p>
        </div>
      </div>

      {/* Passport Box */}
      <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 4px; color: #222;">
          1. ПАСПОРТ ТА ТЕХНІЧНІ ДАНІ ОБЛАДНАННЯ
        </h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px;">
          <div><strong>Назва / Модель:</strong> ${equipment.nomenclatureName}</div>
          <div><strong>Класифікація:</strong> ${equipment.classification || equipment.subcategory || '—'}</div>
          <div><strong>Номенклатурний №:</strong> ${equipment.nomenclatureNumber}</div>
          <div><strong>Серійний №:</strong> ${equipment.serialNumber || 'Б/Н'}</div>
          <div><strong>Бренд / Марка:</strong> ${equipment.brand || '—'}</div>
          <div><strong>Категорія:</strong> ${equipment.category}</div>
          <div><strong>Підрозділ / Цех:</strong> ${equipment.division}</div>
          <div><strong>Відповідальна особа:</strong> ${equipment.responsiblePerson}</div>
          <div><strong>Введення в експлуатацію:</strong> ${equipment.commissioningDate || '—'}</div>
          <div><strong>Поточний статус:</strong> ${
            equipment.status === 'in_work' ? 'В роботі' :
            equipment.status === 'repair' ? 'На ремонті' :
            equipment.status === 'awaiting_parts' ? 'Чекає запчастин' : 'На складі'
          }</div>
        </div>
      </div>

      ${repair ? `
      {/* Repair Section */}
      <div style="background: #fff; border: 1px solid #ddd; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; font-size: 13px; font-weight: bold; color: #222; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 4px;">
          2. ВІДФІКСОВАНИЙ РЕМОНТ (Дата: ${repair.date})
        </h3>
        
        <div style="margin-bottom: 10px;">
          <strong>Опис несправності:</strong>
          <p style="margin: 4px 0 0 0; background: #f8f9fa; border: 1px solid #eee; padding: 6px 8px; border-radius: 4px; font-size: 11px;">${repair.faultDescription}</p>
        </div>

        <div style="margin-bottom: 10px;">
          <strong>Перелік виконаних робіт:</strong>
          <p style="margin: 4px 0 0 0; background: #f8f9fa; border: 1px solid #eee; padding: 6px 8px; border-radius: 4px; font-size: 11px;">${repair.workDone}</p>
        </div>

        <div style="margin-bottom: 10px;">
          <strong>Списані запчастини та витратні матеріали при ремонті:</strong>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 4px;">
            <thead>
              <tr style="background: #f1f3f5; text-align: left;">
                <th style="padding: 5px; border: 1px solid #ccc; width: 30px; text-align: center;">№</th>
                <th style="padding: 5px; border: 1px solid #ccc;">Найменування матеріалу</th>
                <th style="padding: 5px; border: 1px solid #ccc; text-align: center;">К-сть</th>
                <th style="padding: 5px; border: 1px solid #ccc; text-align: right;">Ціна (грн)</th>
                <th style="padding: 5px; border: 1px solid #ccc; text-align: right;">Сума (грн)</th>
              </tr>
            </thead>
            <tbody>
              ${
                repair.usedParts && repair.usedParts.length > 0
                  ? repair.usedParts.map((p, idx) => `
                    <tr>
                      <td style="padding: 5px; border: 1px solid #ccc; text-align: center;">${idx + 1}</td>
                      <td style="padding: 5px; border: 1px solid #ccc;">${p.itemName}</td>
                      <td style="padding: 5px; border: 1px solid #ccc; text-align: center;">${p.quantity}</td>
                      <td style="padding: 5px; border: 1px solid #ccc; text-align: right;">${p.unitPrice.toFixed(2)}</td>
                      <td style="padding: 5px; border: 1px solid #ccc; text-align: right;">${(p.quantity * p.unitPrice).toFixed(2)}</td>
                    </tr>
                  `).join('')
                  : `<tr><td colspan="5" style="padding: 6px; border: 1px solid #ccc; text-align: center; color: #777;">Запчастини зі складу не використовувалися</td></tr>`
              }
            </tbody>
          </table>
        </div>

        <div style="display: flex; justify-content: flex-end;">
          <div style="width: 260px; background: #f8f9fa; border: 1px solid #ddd; padding: 8px 10px; border-radius: 6px; font-size: 11px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>Вартість запчастин:</span>
              <strong>${repair.costParts.toFixed(2)} грн</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>Вартість робіт (${repair.performerType === 'self' ? 'Власні сили' : repair.performerName}):</span>
              <strong>${repair.costWork.toFixed(2)} грн</strong>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1.5px solid #333; padding-top: 4px; font-weight: bold;">
              <span>Всього за ремонт:</span>
              <span style="color: #ff6b00;">${repair.totalCost.toFixed(2)} грн</span>
            </div>
          </div>
        </div>
      </div>
      ` : ''}

      {/* Consumables & Needles Issued History Section */}
      <div style="margin-bottom: 16px;">
        <h3 style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold; color: #222; text-transform: uppercase;">
          ${repair ? '3' : '2'}. ДАТИ ВИДАЧІ РОЗХІДНИКІВ, ГОЛОК ТА МАТЕРІАЛІВ ЗІ СКЛАДУ
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: #e9ecef; text-align: left;">
              <th style="padding: 6px; border: 1px solid #ccc; width: 30px; text-align: center;">№</th>
              <th style="padding: 6px; border: 1px solid #ccc; width: 90px; text-align: center;">Дата видачі</th>
              <th style="padding: 6px; border: 1px solid #ccc;">Найменування розхідника / матеріалу</th>
              <th style="padding: 6px; border: 1px solid #ccc; width: 100px;">Категорія</th>
              <th style="padding: 6px; border: 1px solid #ccc; text-align: center; width: 70px;">К-сть</th>
              <th style="padding: 6px; border: 1px solid #ccc;">Примітка / Призначення</th>
            </tr>
          </thead>
          <tbody>
            ${
              machineIssuedMovements.length > 0
                ? machineIssuedMovements.map((mov, idx) => `
                  <tr>
                    <td style="padding: 5px; border: 1px solid #ccc; text-align: center;">${idx + 1}</td>
                    <td style="padding: 5px; border: 1px solid #ccc; text-align: center; font-weight: bold;">${mov.date}</td>
                    <td style="padding: 5px; border: 1px solid #ccc;">${mov.itemName}</td>
                    <td style="padding: 5px; border: 1px solid #ccc;">${mov.category || 'Витратники'}</td>
                    <td style="padding: 5px; border: 1px solid #ccc; text-align: center; font-weight: bold; color: #d9534f;">
                      ${Math.abs(mov.quantity)} ${mov.unit || 'шт'}
                    </td>
                    <td style="padding: 5px; border: 1px solid #ccc; font-size: 10px; color: #444;">${mov.note || '—'}</td>
                  </tr>
                `).join('')
                : `<tr><td colspan="6" style="padding: 8px; border: 1px solid #ccc; text-align: center; color: #777;">Видач голок та витратних матеріалів зі складу не зафіксовано</td></tr>`
            }
          </tbody>
        </table>
      </div>

      {/* Scheduled Maintenance Plans Section */}
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold; color: #222; text-transform: uppercase;">
          ${repair ? '4' : '3'}. ЗАПЛАНОВАНІ РЕГЛАМЕНТНІ РОБОТИ (ТО)
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: #e9ecef; text-align: left;">
              <th style="padding: 6px; border: 1px solid #ccc; width: 30px; text-align: center;">№</th>
              <th style="padding: 6px; border: 1px solid #ccc;">Вид регламентних робіт</th>
              <th style="padding: 6px; border: 1px solid #ccc; width: 140px;">Періодичність</th>
              <th style="padding: 6px; border: 1px solid #ccc; width: 110px; text-align: center;">Запланована дата ТО</th>
            </tr>
          </thead>
          <tbody>
            ${
              equipment.maintenancePlans && equipment.maintenancePlans.length > 0
                ? equipment.maintenancePlans.map((mp, idx) => `
                  <tr>
                    <td style="padding: 5px; border: 1px solid #ccc; text-align: center;">${idx + 1}</td>
                    <td style="padding: 5px; border: 1px solid #ccc;"><strong>${mp.workType}</strong></td>
                    <td style="padding: 5px; border: 1px solid #ccc;">
                      Кожні ${mp.frequencyValue} ${mp.frequencyType === 'days' ? 'днів' : mp.frequencyType === 'months' ? 'місяців' : 'годин'}
                    </td>
                    <td style="padding: 5px; border: 1px solid #ccc; text-align: center; font-weight: bold; color: #ff6b00;">
                      ${mp.nextDueDate}
                    </td>
                  </tr>
                `).join('')
                : `<tr><td colspan="4" style="padding: 8px; border: 1px solid #ccc; text-align: center; color: #777;">Регламентні роботи не налаштовані</td></tr>`
            }
          </tbody>
        </table>
      </div>

      {/* Signatures */}
      <div style="margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; padding-top: 16px; border-top: 1px solid #ddd;">
        <div>
          <p style="margin: 0 0 30px 0;"><strong>Відповідальний за ТО / Механік:</strong></p>
          <div style="border-bottom: 1px solid #000; display: flex; justify-content: space-between; font-size: 11px; color: #555;">
            <span>(підпис)</span>
            <span>${repair ? repair.performerName : 'Головний механік'}</span>
          </div>
        </div>
        <div>
          <p style="margin: 0 0 30px 0;"><strong>Прийняв (відповідальний за обладнання):</strong></p>
          <div style="border-bottom: 1px solid #000; display: flex; justify-content: space-between; font-size: 11px; color: #555;">
            <span>(підпис)</span>
            <span>${equipment.responsiblePerson}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  const fileName = repair
    ? `Акт_Ремонту_${equipment.nomenclatureNumber}_${repair.date}.pdf`
    : `Паспорт_Та_Звіт_${equipment.nomenclatureNumber}.pdf`;

  await generatePdfFromHtml(container, fileName);
}

// 2. Подання про відпраційовані години (Timesheet)
export async function downloadTimesheetPDF(
  monthYear: string, // YYYY-MM
  logs: WorkDayLog[],
  settings: SalarySettings
) {
  const container = document.createElement('div');
  container.className = 'pdf-render-box';

  const dateObj = new Date(`${monthYear}-01`);
  const monthNameUk = dateObj.toLocaleString('uk-UA', { month: 'long', year: 'numeric' });

  const hourlyRate = settings.monthlySalary / (settings.workingDaysInMonth * 8);

  let totalHoursWeekday = 0;
  let totalHoursWeekend = 0;

  logs.sort((a, b) => a.date.localeCompare(b.date));

  const rowsHtml = logs.map((log, idx) => {
    const d = new Date(log.date);
    const dayNum = d.getDate();
    const dayOfWeekStr = d.toLocaleDateString('uk-UA', { weekday: 'short' });
    const isWk = log.isWeekend || d.getDay() === 0 || d.getDay() === 6;

    if (isWk) {
      totalHoursWeekend += log.hours;
    } else {
      totalHoursWeekday += log.hours;
    }

    const rateMult = isWk ? 1.5 : 1.0;
    const earned = log.hours * hourlyRate * rateMult;

    return `
      <tr style="${isWk ? 'background: #fff8f0;' : ''}">
        <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">${log.date} (${dayOfWeekStr})</td>
        <td style="padding: 6px; border: 1px solid #ccc; text-align: center; font-weight: bold;">${log.hours} год</td>
        <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">${isWk ? 'Вихідний (×1.5)' : 'Звичайний (×1.0)'}</td>
        <td style="padding: 6px; border: 1px solid #ccc; text-align: right;">${earned.toFixed(2)} грн</td>
        <td style="padding: 6px; border: 1px solid #ccc; font-size: 11px;">${log.note || '—'}</td>
      </tr>
    `;
  }).join('');

  const totalWeekdayEarned = totalHoursWeekday * hourlyRate;
  const totalWeekendEarned = totalHoursWeekend * hourlyRate * 1.5;
  const totalSalary = totalWeekdayEarned + totalWeekendEarned;

  container.innerHTML = `
    <div style="font-family: Arial, sans-serif; font-size: 12px; color: #111; line-height: 1.4;">
      <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 16px;">
        <h2 style="margin: 0; font-size: 18px; font-weight: bold; text-transform: uppercase;">ПОДАННЯ ПРО ВІДПРАЦЬОВАНІ ГОДИНИ</h2>
        <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: bold; color: #ff6b00; text-transform: capitalize;">за ${monthNameUk}</p>
      </div>

      <div style="display: flex; justify-content: space-between; background: #f8f9fa; border: 1px solid #ddd; padding: 10px 14px; border-radius: 6px; margin-bottom: 16px;">
        <div><strong>ПІБ працівника:</strong> ${settings.fullName}</div>
        <div><strong>Посада:</strong> ${settings.position}</div>
        <div><strong>Місячна ставка:</strong> ${settings.monthlySalary} грн</div>
        <div><strong>Годинна ставка:</strong> ${hourlyRate.toFixed(2)} грн/год</div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px;">
        <thead>
          <tr style="background: #e9ecef;">
            <th style="padding: 6px; border: 1px solid #ccc; width: 30px;">№</th>
            <th style="padding: 6px; border: 1px solid #ccc;">Дата (день тижня)</th>
            <th style="padding: 6px; border: 1px solid #ccc;">Відпрацьовано</th>
            <th style="padding: 6px; border: 1px solid #ccc;">Тарифний коефіцієнт</th>
            <th style="padding: 6px; border: 1px solid #ccc; text-align: right;">Нараховано</th>
            <th style="padding: 6px; border: 1px solid #ccc;">Примітка / Вид робіт</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml.length > 0 ? rowsHtml : `<tr><td colspan="6" style="padding: 12px; text-align: center;">Немає записів за цей місяць</td></tr>`}
        </tbody>
      </table>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
        <div style="background: #f8f9fa; border: 1px solid #ddd; padding: 12px; border-radius: 6px;">
          <h4 style="margin: 0 0 8px 0; font-size: 12px; border-bottom: 1px solid #ccc; padding-bottom: 4px;">Підсумок відпрацьованого часу:</h4>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Будні дні:</span>
            <strong>${totalHoursWeekday} год (${totalWeekdayEarned.toFixed(2)} грн)</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Вихідні/свята (×1.5):</span>
            <strong>${totalHoursWeekend} год (${totalWeekendEarned.toFixed(2)} грн)</strong>
          </div>
          <div style="display: flex; justify-content: space-between; border-top: 1px solid #ccc; padding-top: 4px;">
            <span>Всього годин:</span>
            <strong>${totalHoursWeekday + totalHoursWeekend} год</strong>
          </div>
        </div>

        <div style="background: #fff8f0; border: 1.5px solid #ff6b00; padding: 12px; border-radius: 6px; text-align: right;">
          <span style="font-size: 12px; color: #555;">Загальна сума до виплати за місяць:</span>
          <div style="font-size: 22px; font-weight: bold; color: #ff6b00; margin-top: 4px;">
            ${totalSalary.toFixed(2)} грн
          </div>
        </div>
      </div>

      <div style="margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; padding-top: 20px; border-top: 1px solid #ddd;">
        <div>
          <p style="margin: 0 0 30px 0;"><strong>Подав (працівник):</strong></p>
          <div style="border-bottom: 1px solid #000; display: flex; justify-content: space-between; font-size: 11px; color: #555;">
            <span>(підпис)</span>
            <span>${settings.fullName}</span>
          </div>
        </div>
        <div>
          <p style="margin: 0 0 30px 0;"><strong>Затверджено (бухгалтерія/керівник):</strong></p>
          <div style="border-bottom: 1px solid #000; display: flex; justify-content: space-between; font-size: 11px; color: #555;">
            <span>(підпис)</span>
            <span>Головний бухгалтер</span>
          </div>
        </div>
      </div>
    </div>
  `;

  await generatePdfFromHtml(container, `Подання_Табель_${monthYear}_${settings.fullName.replace(/\s+/g, '_')}.pdf`);
}

// 3. Акт інвентаризації складу (Inventory Discrepancy Act)
export async function downloadInventoryActPDF(act: InventoryAct) {
  const container = document.createElement('div');
  container.className = 'pdf-render-box';

  const rows = act.items.map((it, idx) => {
    const diffVal = Number(it.difference) || 0;
    const diffText = diffVal > 0 ? `+${diffVal}` : diffVal < 0 ? `${diffVal}` : '0';
    const diffColor = diffVal < 0 ? 'color: #d9534f; font-weight: bold;' : diffVal > 0 ? 'color: #5cb85c; font-weight: bold;' : 'color: #777;';

    return `
      <tr>
        <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px; border: 1px solid #ccc;">
          <strong>${it.itemName}</strong><br/>
          <span style="font-size: 10px; color: #555;">Категорія: ${it.category}</span>
        </td>
        <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">${it.unit}</td>
        <td style="padding: 6px; border: 1px solid #ccc; text-align: center; font-weight: bold;">${it.accountingStock}</td>
        <td style="padding: 6px; border: 1px solid #ccc; text-align: center; font-weight: bold; background: #fafafa;">${it.actualStock}</td>
        <td style="padding: 6px; border: 1px solid #ccc; text-align: center; ${diffColor}">${diffText}</td>
        <td style="padding: 6px; border: 1px solid #ccc; font-size: 11px;">${it.note || '—'}</td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div style="font-family: Arial, sans-serif; font-size: 12px; color: #111; line-height: 1.4;">
      <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 16px;">
        <div>
          <h2 style="margin: 0; font-size: 18px; font-weight: bold; text-transform: uppercase;">АКТ ІНВЕНТАРИЗАЦІЇ ТА ФАКТИЧНИХ ЗАЛИШКІВ СКЛАДУ</h2>
          <p style="margin: 4px 0 0 0; color: #555; font-size: 12px;">Швейне виробництво • Benito Eugenio</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; font-weight: bold;">№ ACT-INV-${act.id.slice(-5).toUpperCase()}</p>
          <p style="margin: 2px 0 0 0; color: #555;">Дата проведення: ${act.date}</p>
        </div>
      </div>

      <div style="margin-bottom: 16px; background: #f8f9fa; border: 1px solid #ddd; padding: 10px; border-radius: 6px;">
        <strong>Відповідальна особа / Голова комісії:</strong> ${act.responsiblePerson}
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px;">
        <thead>
          <tr style="background: #e9ecef;">
            <th style="padding: 6px; border: 1px solid #ccc; width: 30px;">№</th>
            <th style="padding: 6px; border: 1px solid #ccc;">Найменування позиції</th>
            <th style="padding: 6px; border: 1px solid #ccc; width: 60px; text-align: center;">Од. вим.</th>
            <th style="padding: 6px; border: 1px solid #ccc; width: 80px; text-align: center;">За обліком</th>
            <th style="padding: 6px; border: 1px solid #ccc; width: 80px; text-align: center;">Фактично</th>
            <th style="padding: 6px; border: 1px solid #ccc; width: 80px; text-align: center;">Розбіжність</th>
            <th style="padding: 6px; border: 1px solid #ccc;">Примітка</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div style="margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; padding-top: 20px; border-top: 1px solid #ddd;">
        <div>
          <p style="margin: 0 0 30px 0;"><strong>Голова комісії / Інженер:</strong></p>
          <div style="border-bottom: 1px solid #000; display: flex; justify-content: space-between; font-size: 11px; color: #555;">
            <span>(підпис)</span>
            <span>${act.responsiblePerson}</span>
          </div>
        </div>
        <div>
          <p style="margin: 0 0 30px 0;"><strong>Матеріально відповідальна особа:</strong></p>
          <div style="border-bottom: 1px solid #000; display: flex; justify-content: space-between; font-size: 11px; color: #555;">
            <span>(підпис)</span>
            <span>Завідувач складом</span>
          </div>
        </div>
      </div>
    </div>
  `;

  await generatePdfFromHtml(container, `Акт_Інвентаризації_${act.date}.pdf`);
}

// 4. Звіт по техніці та витратам на обслуговування
export async function downloadEquipmentStatsPDF(equipmentList: EquipmentItem[]) {
  const container = document.createElement('div');
  container.className = 'pdf-render-box';

  const rows = equipmentList.map((eq, idx) => {
    const totalRepairs = eq.repairs.length;
    const totalCost = eq.repairs.reduce((sum, r) => sum + r.totalCost, 0);

    return `
      <tr>
        <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px; border: 1px solid #ccc;">
          <strong>${eq.nomenclatureName}</strong><br/>
          <span style="font-size: 10px; color: #333;">Класифікація: ${eq.classification || eq.subcategory}</span><br/>
          <span style="font-size: 10px; color: #555;">№ ${eq.nomenclatureNumber} | Серія: ${eq.serialNumber}</span>
        </td>
        <td style="padding: 6px; border: 1px solid #ccc;">${eq.division}</td>
        <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">${eq.status}</td>
        <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">${totalRepairs}</td>
        <td style="padding: 6px; border: 1px solid #ccc; text-align: right; font-weight: bold;">${totalCost.toFixed(2)} грн</td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div style="font-family: Arial, sans-serif; font-size: 12px; color: #111; line-height: 1.4;">
      <div style="border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 16px;">
        <h2 style="margin: 0; font-size: 18px; font-weight: bold; text-transform: uppercase;">ЗВІТ ПРО СТАН ТА ВИТРАТИ НА ОБСЛУГОВУВАННЯ ТЕХНІКИ</h2>
        <p style="margin: 4px 0 0 0; color: #555;">Сформовано: ${new Date().toLocaleDateString('uk-UA')}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px;">
        <thead>
          <tr style="background: #e9ecef;">
            <th style="padding: 6px; border: 1px solid #ccc; width: 30px;">№</th>
            <th style="padding: 6px; border: 1px solid #ccc;">Обладнання / Номери</th>
            <th style="padding: 6px; border: 1px solid #ccc;">Підрозділ</th>
            <th style="padding: 6px; border: 1px solid #ccc;">Статус</th>
            <th style="padding: 6px; border: 1px solid #ccc;">Ремонтів</th>
            <th style="padding: 6px; border: 1px solid #ccc; text-align: right;">Сума витрат</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;

  await generatePdfFromHtml(container, `Звіт_Техніка_${new Date().toISOString().split('T')[0]}.pdf`);
}

// 5. Звіт по складу та руху матеріалів
export async function downloadWarehouseReportPDF(warehouseList: WarehouseItem[]) {
  const container = document.createElement('div');
  container.className = 'pdf-render-box';

  const rows = warehouseList.map((wh, idx) => {
    let statusText = 'В нормі';
    let statusBg = 'background: #e6f4ea; color: #137333;';
    if (wh.currentStock === 0) {
      statusText = 'Критично (0)';
      statusBg = 'background: #fce8e6; color: #c5221f; font-weight: bold;';
    } else if (wh.currentStock <= wh.minStockThreshold) {
      statusText = 'Низький залишок';
      statusBg = 'background: #fef7e0; color: #b06000; font-weight: bold;';
    }

    const val = (wh.purchasePrice || 0) * wh.currentStock;

    const specsStr = [wh.brand, wh.specs, wh.purpose].filter(Boolean).join(' | ');

    return `
      <tr>
        <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px; border: 1px solid #ccc;">
          <strong>${wh.name}</strong><br/>
          <span style="font-size: 10px; color: #555;">${specsStr || wh.category}</span>
        </td>
        <td style="padding: 6px; border: 1px solid #ccc;">${wh.category}</td>
        <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">${wh.currentStock} ${wh.unit}</td>
        <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">${wh.minStockThreshold} ${wh.unit}</td>
        <td style="padding: 6px; border: 1px solid #ccc; text-align: center; ${statusBg}">${statusText}</td>
        <td style="padding: 6px; border: 1px solid #ccc; text-align: right;">${val.toFixed(2)} грн</td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div style="font-family: Arial, sans-serif; font-size: 12px; color: #111; line-height: 1.4;">
      <div style="border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 16px;">
        <h2 style="margin: 0; font-size: 18px; font-weight: bold; text-transform: uppercase;">ЗВІТ ПРО СТАН ТА ЗАЛИШКИ СКЛАДУ</h2>
        <p style="margin: 4px 0 0 0; color: #555;">Сформовано: ${new Date().toLocaleDateString('uk-UA')}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px;">
        <thead>
          <tr style="background: #e9ecef;">
            <th style="padding: 6px; border: 1px solid #ccc; width: 30px;">№</th>
            <th style="padding: 6px; border: 1px solid #ccc;">Найменування та Специфікація</th>
            <th style="padding: 6px; border: 1px solid #ccc;">Категорія</th>
            <th style="padding: 6px; border: 1px solid #ccc;">Поточний залишок</th>
            <th style="padding: 6px; border: 1px solid #ccc;">Мін. поріг</th>
            <th style="padding: 6px; border: 1px solid #ccc;">Статус</th>
            <th style="padding: 6px; border: 1px solid #ccc; text-align: right;">Оціночна вартість</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;

  await generatePdfFromHtml(container, `Звіт_Склад_${new Date().toISOString().split('T')[0]}.pdf`);
}

// 6. Звіт про приходи товарів та матеріалів на склад
export async function downloadReceiptsReportPDF(
  warehouseList: WarehouseItem[],
  dateFrom?: string,
  dateTo?: string
) {
  const container = document.createElement('div');
  container.className = 'pdf-render-box';

  // Extract all receipt movements
  const receipts: Array<{
    date: string;
    itemName: string;
    category: string;
    brand?: string;
    specs?: string;
    purpose?: string;
    unit: string;
    quantity: number;
    price: number;
    totalVal: number;
    note: string;
    supplier?: string;
  }> = [];

  warehouseList.forEach((wh) => {
    wh.movements.forEach((mov) => {
      const isReceipt = mov.type === 'receipt' || mov.quantity > 0;
      if (isReceipt) {
        const movDate = mov.date.split('T')[0];
        if (dateFrom && movDate < dateFrom) return;
        if (dateTo && movDate > dateTo) return;

        receipts.push({
          date: movDate,
          itemName: wh.name,
          category: wh.category,
          brand: wh.brand,
          specs: wh.specs,
          purpose: wh.purpose,
          unit: wh.unit,
          quantity: Math.abs(mov.quantity),
          price: wh.purchasePrice || 0,
          totalVal: Math.abs(mov.quantity) * (wh.purchasePrice || 0),
          note: mov.note || 'Прихід на склад',
          supplier: wh.supplier,
        });
      }
    });
  });

  // Strict chronological sorting: newest first
  receipts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let grandQty = 0;
  let grandTotalVal = 0;

  const rows = receipts.map((r, idx) => {
    grandQty += r.quantity;
    grandTotalVal += r.totalVal;

    const specsDetails = [r.brand, r.specs, r.purpose].filter(Boolean).join(' | ');

    return `
      <tr>
        <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px; border: 1px solid #ccc; font-weight: bold; font-family: monospace; text-align: center;">${r.date}</td>
        <td style="padding: 6px; border: 1px solid #ccc;">
          <strong>${r.itemName}</strong><br/>
          <span style="font-size: 10px; color: #555;">Категорія: ${r.category}</span>
        </td>
        <td style="padding: 6px; border: 1px solid #ccc; font-size: 10px;">
          ${specsDetails || '—'}
        </td>
        <td style="padding: 6px; border: 1px solid #ccc; text-align: center; color: #137333; font-weight: bold;">
          +${r.quantity} ${r.unit}
        </td>
        <td style="padding: 6px; border: 1px solid #ccc; text-align: right;">${r.price ? r.price.toFixed(2) + ' грн' : '—'}</td>
        <td style="padding: 6px; border: 1px solid #ccc; text-align: right; font-weight: bold;">${r.totalVal ? r.totalVal.toFixed(2) + ' грн' : '—'}</td>
        <td style="padding: 6px; border: 1px solid #ccc; font-size: 10px;">
          ${r.supplier ? `<b>Постачальник:</b> ${r.supplier}<br/>` : ''}
          ${r.note}
        </td>
      </tr>
    `;
  }).join('');

  const periodSubtitle = dateFrom || dateTo
    ? `Період з ${dateFrom || 'початку'} по ${dateTo || 'сьогодні'}`
    : 'За весь період обліку';

  container.innerHTML = `
    <div style="font-family: Arial, sans-serif; font-size: 12px; color: #111; line-height: 1.4;">
      <div style="border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <h2 style="margin: 0; font-size: 18px; font-weight: bold; text-transform: uppercase; color: #137333;">ЗВІТ ПРИХОДІВ МАТЕРІАЛІВ ТА ГОЛОК НА СКЛАД</h2>
          <p style="margin: 4px 0 0 0; color: #555; font-size: 11px;">Швейне виробництво • ${periodSubtitle}</p>
        </div>
        <div style="text-align: right; font-size: 11px; color: #666;">
          Сформовано: <strong>${new Date().toLocaleDateString('uk-UA')}</strong>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px;">
        <thead>
          <tr style="background: #e6f4ea; color: #137333;">
            <th style="padding: 6px; border: 1px solid #ccc; width: 30px;">№</th>
            <th style="padding: 6px; border: 1px solid #ccc; width: 85px; text-align: center;">Дата приходу</th>
            <th style="padding: 6px; border: 1px solid #ccc;">Найменування</th>
            <th style="padding: 6px; border: 1px solid #ccc;">Специфікація / Бренд / ТТХ</th>
            <th style="padding: 6px; border: 1px solid #ccc; width: 80px; text-align: center;">К-сть приходу</th>
            <th style="padding: 6px; border: 1px solid #ccc; width: 70px; text-align: right;">Ціна за од.</th>
            <th style="padding: 6px; border: 1px solid #ccc; width: 80px; text-align: right;">Сума</th>
            <th style="padding: 6px; border: 1px solid #ccc;">Постачальник / Примітка</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length > 0 ? rows : `<tr><td colspan="8" style="padding: 12px; text-align: center; color: #777;">Зафіксованих приходів за обраний період не знайдено</td></tr>`}
        </tbody>
      </table>

      <div style="background: #f8f9fa; border: 1px solid #ddd; padding: 12px; border-radius: 8px; font-size: 12px; display: flex; justify-content: space-between;">
        <div>Загальна кількість зафіксованих операцій приходу: <strong>${receipts.length}</strong></div>
        <div>Всього зараховано одиниць: <strong style="color: #137333;">${grandQty}</strong></div>
        <div>Загальна сума закупівлі: <strong style="color: #137333;">${grandTotalVal.toFixed(2)} грн</strong></div>
      </div>
    </div>
  `;

  await generatePdfFromHtml(container, `Звіт_Приходів_Складу_${dateFrom || 'all'}_${dateTo || 'today'}.pdf`);
}

// 7. Звіт про видачі та витрати зі складу
export async function downloadIssuancesReportPDF(
  warehouseList: WarehouseItem[],
  dateFrom?: string,
  dateTo?: string
) {
  const container = document.createElement('div');
  container.className = 'pdf-render-box';

  const issuances: Array<{
    date: string;
    itemName: string;
    category: string;
    brand?: string;
    specs?: string;
    purpose?: string;
    unit: string;
    quantity: number;
    note: string;
    equipmentName?: string;
    division?: string;
  }> = [];

  warehouseList.forEach((wh) => {
    wh.movements.forEach((mov) => {
      const isExpense = mov.type === 'expense' || mov.type === 'repair_deduction' || mov.quantity < 0;
      if (isExpense) {
        const movDate = mov.date.split('T')[0];
        if (dateFrom && movDate < dateFrom) return;
        if (dateTo && movDate > dateTo) return;

        issuances.push({
          date: movDate,
          itemName: wh.name,
          category: wh.category,
          brand: wh.brand,
          specs: wh.specs,
          purpose: wh.purpose,
          unit: wh.unit,
          quantity: Math.abs(mov.quantity),
          note: mov.note || 'Видача зі складу',
          equipmentName: mov.equipmentName,
          division: mov.division,
        });
      }
    });
  });

  // Strict chronological sorting: newest first
  issuances.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let totalIssuedUnits = 0;

  const rows = issuances.map((iss, idx) => {
    totalIssuedUnits += iss.quantity;

    let destination = 'Загальне списання';
    if (iss.equipmentName) {
      destination = `⚙️ ${iss.equipmentName}`;
    } else if (iss.division) {
      destination = `🏢 ${iss.division}`;
    }

    const specsDetails = [iss.brand, iss.specs, iss.purpose].filter(Boolean).join(' | ');

    return `
      <tr>
        <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px; border: 1px solid #ccc; font-weight: bold; font-family: monospace; text-align: center;">${iss.date}</td>
        <td style="padding: 6px; border: 1px solid #ccc;">
          <strong>${iss.itemName}</strong><br/>
          <span style="font-size: 10px; color: #555;">Категорія: ${iss.category}</span>
        </td>
        <td style="padding: 6px; border: 1px solid #ccc; font-size: 10px;">
          ${specsDetails || '—'}
        </td>
        <td style="padding: 6px; border: 1px solid #ccc; text-align: center; color: #c5221f; font-weight: bold;">
          -${iss.quantity} ${iss.unit}
        </td>
        <td style="padding: 6px; border: 1px solid #ccc;">
          <strong>${destination}</strong>
        </td>
        <td style="padding: 6px; border: 1px solid #ccc; font-size: 10px;">
          ${iss.note}
        </td>
      </tr>
    `;
  }).join('');

  const periodSubtitle = dateFrom || dateTo
    ? `Період з ${dateFrom || 'початку'} по ${dateTo || 'сьогодні'}`
    : 'За весь період обліку';

  container.innerHTML = `
    <div style="font-family: Arial, sans-serif; font-size: 12px; color: #111; line-height: 1.4;">
      <div style="border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <h2 style="margin: 0; font-size: 18px; font-weight: bold; text-transform: uppercase; color: #c5221f;">ЗВІТ ПРО ВИДАЧУ ТА ВИТРАТИ МАТЕРІАЛІВ</h2>
          <p style="margin: 4px 0 0 0; color: #555; font-size: 11px;">Швейне виробництво • ${periodSubtitle}</p>
        </div>
        <div style="text-align: right; font-size: 11px; color: #666;">
          Сформовано: <strong>${new Date().toLocaleDateString('uk-UA')}</strong>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px;">
        <thead>
          <tr style="background: #fce8e6; color: #c5221f;">
            <th style="padding: 6px; border: 1px solid #ccc; width: 30px;">№</th>
            <th style="padding: 6px; border: 1px solid #ccc; width: 85px; text-align: center;">Дата видачі</th>
            <th style="padding: 6px; border: 1px solid #ccc;">Найменування</th>
            <th style="padding: 6px; border: 1px solid #ccc;">Специфікація / Бренд / ТТХ</th>
            <th style="padding: 6px; border: 1px solid #ccc; width: 80px; text-align: center;">К-сть видачі</th>
            <th style="padding: 6px; border: 1px solid #ccc;">Кому видано (Машинка / Цех)</th>
            <th style="padding: 6px; border: 1px solid #ccc;">Примітка</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length > 0 ? rows : `<tr><td colspan="7" style="padding: 12px; text-align: center; color: #777;">Видач зі складу за обраний період не зафіксовано</td></tr>`}
        </tbody>
      </table>

      <div style="background: #f8f9fa; border: 1px solid #ddd; padding: 12px; border-radius: 8px; font-size: 12px; display: flex; justify-content: space-between;">
        <div>Всього зафіксовано видач: <strong>${issuances.length}</strong></div>
        <div>Всього видано матеріалів: <strong style="color: #c5221f;">${totalIssuedUnits} одиниць</strong></div>
      </div>
    </div>
  `;

  await generatePdfFromHtml(container, `Звіт_Видач_Складу_${dateFrom || 'all'}_${dateTo || 'today'}.pdf`);
}

// 8. Повний Журнал руху матеріалів та запчастин
export async function downloadFullMovementsReportPDF(
  warehouseList: WarehouseItem[],
  dateFrom?: string,
  dateTo?: string
) {
  const container = document.createElement('div');
  container.className = 'pdf-render-box';

  const allMovements: Array<{
    date: string;
    itemName: string;
    category: string;
    brand?: string;
    specs?: string;
    purpose?: string;
    unit: string;
    type: string;
    quantity: number;
    note: string;
    equipmentName?: string;
    division?: string;
  }> = [];

  warehouseList.forEach((wh) => {
    wh.movements.forEach((mov) => {
      const movDate = mov.date.split('T')[0];
      if (dateFrom && movDate < dateFrom) return;
      if (dateTo && movDate > dateTo) return;

      allMovements.push({
        date: movDate,
        itemName: wh.name,
        category: wh.category,
        brand: wh.brand,
        specs: wh.specs,
        purpose: wh.purpose,
        unit: wh.unit,
        type: mov.type,
        quantity: mov.quantity,
        note: mov.note || '',
        equipmentName: mov.equipmentName,
        division: mov.division,
      });
    });
  });

  // Strict chronological sorting: newest first
  allMovements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const rows = allMovements.map((mov, idx) => {
    const isPlus = mov.quantity > 0 || mov.type === 'receipt';
    const qtyText = isPlus ? `+${mov.quantity}` : `${mov.quantity}`;
    const qtyColor = isPlus ? 'color: #137333; font-weight: bold;' : 'color: #c5221f; font-weight: bold;';

    let targetInfo = mov.note;
    if (mov.equipmentName) {
      targetInfo += ` [На машинку: ${mov.equipmentName}]`;
    } else if (mov.division) {
      targetInfo += ` [Цех: ${mov.division}]`;
    }

    const specsDetails = [mov.brand, mov.specs, mov.purpose].filter(Boolean).join(' | ');

    return `
      <tr>
        <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px; border: 1px solid #ccc; font-family: monospace; text-align: center;">${mov.date}</td>
        <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">
          ${isPlus ? '<span style="color: #137333; font-weight: bold;">Прихід</span>' : '<span style="color: #c5221f; font-weight: bold;">Видача</span>'}
        </td>
        <td style="padding: 6px; border: 1px solid #ccc;">
          <strong>${mov.itemName}</strong><br/>
          <span style="font-size: 10px; color: #555;">Категорія: ${mov.category}</span>
        </td>
        <td style="padding: 6px; border: 1px solid #ccc; font-size: 10px;">
          ${specsDetails || '—'}
        </td>
        <td style="padding: 6px; border: 1px solid #ccc; text-align: center; ${qtyColor}">${qtyText} ${mov.unit}</td>
        <td style="padding: 6px; border: 1px solid #ccc;">${targetInfo}</td>
      </tr>
    `;
  }).join('');

  const periodSubtitle = dateFrom || dateTo
    ? `Період з ${dateFrom || 'початку'} по ${dateTo || 'сьогодні'}`
    : 'За весь період обліку';

  container.innerHTML = `
    <div style="font-family: Arial, sans-serif; font-size: 12px; color: #111; line-height: 1.4;">
      <div style="border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 16px;">
        <h2 style="margin: 0; font-size: 18px; font-weight: bold; text-transform: uppercase;">ЖУРНАЛ РУХУ СКЛАДСЬКИХ ЗАЛИШКІВ</h2>
        <p style="margin: 4px 0 0 0; color: #555;">Повний хронологічний реєстр приходів та видач | ${periodSubtitle}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px;">
        <thead>
          <tr style="background: #e9ecef;">
            <th style="padding: 6px; border: 1px solid #ccc; width: 30px;">№</th>
            <th style="padding: 6px; border: 1px solid #ccc; width: 85px; text-align: center;">Дата</th>
            <th style="padding: 6px; border: 1px solid #ccc; width: 65px; text-align: center;">Тип</th>
            <th style="padding: 6px; border: 1px solid #ccc;">Найменування</th>
            <th style="padding: 6px; border: 1px solid #ccc;">Специфікація / Бренд / ТТХ</th>
            <th style="padding: 6px; border: 1px solid #ccc; width: 80px; text-align: center;">Обсяг руху</th>
            <th style="padding: 6px; border: 1px solid #ccc;">Деталі / Призначення</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length > 0 ? rows : `<tr><td colspan="7" style="padding: 12px; text-align: center; color: #777;">Записів за вказаний період не знайдено</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  await generatePdfFromHtml(container, `Журнал_Руху_Складу_${dateFrom || 'all'}_${dateTo || 'today'}.pdf`);
}


