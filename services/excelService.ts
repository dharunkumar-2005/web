import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';

export interface AttendanceExportData {
  name: string;
  regNo: string;
  status: 'Present' | 'Absent';
  time?: string;
  date: string;
}

export interface DashboardStats {
  totalRegistered: number;
  presentToday: number;
  absentToday: number;
  attendancePercentage: string;
}

export const excelService = {
  /**
   * Export attendance logs to Excel file
   */
  exportAttendanceToExcel: (data: AttendanceExportData[], fileName?: string): void => {
    try {
      if (!data || data.length === 0) {
        alert('No attendance data to export');
        return;
      }

      // Prepare data with better formatting
      const preparedData = data.map(record => ({
        'Name': record.name,
        'Registration Number': record.regNo,
        'Status': record.status,
        'Time': record.time || 'N/A',
        'Date': record.date
      }));

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(preparedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

      // Auto-size columns
      const colWidths = [
        { wch: 25 }, // Name
        { wch: 20 }, // Registration Number
        { wch: 12 }, // Status
        { wch: 15 }, // Time
        { wch: 15 }  // Date
      ];
      worksheet['!cols'] = colWidths;

      // Style header row
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + '1';
        if (!worksheet[address]) continue;
        worksheet[address].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: 'FF007A' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }

      // Apply alternating row colors
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const address = XLSX.utils.encode_cell({ r: R, c: C });
          if (!worksheet[address]) continue;
          worksheet[address].s = {
            fill: { fgColor: { rgb: R % 2 === 0 ? 'F5F5F5' : 'FFFFFF' } },
            alignment: { horizontal: 'left', vertical: 'center' }
          };
        }
      }

      // Save file
      const timestamp = new Date().toISOString().split('T')[0];
      const finalFileName = fileName || `Attendance_Report_${timestamp}.xlsx`;
      XLSX.writeFile(workbook, finalFileName);
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Error exporting file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  },

  /**
   * Export attendance summary report
   */
  exportAttendanceSummary: (stats: DashboardStats, absentStudents: { name: string; regNo: string }[]): void => {
    try {
      const workbook = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        ['ATTENDANCE REPORT SUMMARY'],
        [],
        ['Total Registered Students', stats.totalRegistered],
        ['Present Today', stats.presentToday],
        ['Absent Today', stats.absentToday],
        ['Attendance Percentage', stats.attendancePercentage],
        ['Report Generated', new Date().toLocaleString()]
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Absent students sheet
      if (absentStudents.length > 0) {
        const absentData = absentStudents.map(student => ({
          'Name': student.name,
          'Registration Number': student.regNo,
          'Status': 'ABSENT'
        }));
        const absentSheet = XLSX.utils.json_to_sheet(absentData);
        absentSheet['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(workbook, absentSheet, 'Absent Students');
      }

      const timestamp = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `Attendance_Summary_${timestamp}.xlsx`);
    } catch (error) {
      console.error('Summary export error:', error);
      alert('Error exporting summary: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  },

  /**
   * Import attendance data from Excel
   */
  importAttendanceFromExcel: (file: File): Promise<AttendanceExportData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

          const mappedData: AttendanceExportData[] = jsonData.map(row => ({
            name: row.Name || row.name || '',
            regNo: row['Registration Number'] || row.regNo || '',
            status: (row.Status || row.status || '').toUpperCase() === 'PRESENT' ? 'Present' : 'Absent',
            time: row.Time || row.time,
            date: row.Date || row.date || new Date().toLocaleDateString()
          }));

          resolve(mappedData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsBinaryString(file);
    });
  },

  /**
   * Generate attendance analytics report
   */
  generateAnalyticsReport: (
    dailyStats: { date: string; present: number; absent: number }[],
    studentStats: { name: string; regNo: string; attendanceRate: string }[]
  ): void => {
    try {
      const workbook = XLSX.utils.book_new();

      // Daily statistics sheet
      const dailyData = dailyStats.map(stat => ({
        'Date': stat.date,
        'Present': stat.present,
        'Absent': stat.absent,
        'Total': stat.present + stat.absent,
        'Attendance %': ((stat.present / (stat.present + stat.absent)) * 100).toFixed(2) + '%'
      }));
      const dailySheet = XLSX.utils.json_to_sheet(dailyData);
      dailySheet['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, dailySheet, 'Daily Statistics');

      // Student statistics sheet
      const studentData = studentStats.map(stat => ({
        'Student Name': stat.name,
        'Registration Number': stat.regNo,
        'Attendance Rate': stat.attendanceRate
      }));
      const studentSheet = XLSX.utils.json_to_sheet(studentData);
      studentSheet['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(workbook, studentSheet, 'Student Statistics');

      const timestamp = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `Attendance_Analytics_${timestamp}.xlsx`);
    } catch (error) {
      console.error('Analytics export error:', error);
      alert('Error exporting analytics: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }
};
