import React, { useState } from 'react';
import { Upload, Loader2, FileSpreadsheet, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExcelUploaderProps {
  onMatchesExtracted: (matches: Array<{
    time: string;
    court: number;
    team1: string;
    team2: string;
  }>) => void;
}

export function ExcelUploader({ onMatchesExtracted }: ExcelUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processExcel = async (file: File) => {
    try {
      setLoading(true);
      setError(null);

      const data = await file.arrayBuffer();
      
      if (!data || data.byteLength === 0) {
        throw new Error('The Excel file appears to be empty');
      }

      let workbook;
      try {
        workbook = XLSX.read(data);
      } catch (readError) {
        throw new Error('Unable to read the Excel file. Please ensure it is a valid Excel file (.xlsx or .xls)');
      }
      
      if (!workbook?.SheetNames?.length) {
        throw new Error('The Excel file does not contain any sheets');
      }

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!worksheet) {
        throw new Error('The first sheet in the Excel file is empty');
      }

      let jsonData;
      try {
        jsonData = XLSX.utils.sheet_to_json(worksheet);
      } catch (parseError) {
        throw new Error('Failed to parse the Excel data. Please check the file format');
      }

      if (!Array.isArray(jsonData)) {
        throw new Error('Invalid data format in the Excel file');
      }

      if (jsonData.length === 0) {
        throw new Error('No data found in the Excel file. Please make sure the file contains matches in the correct format');
      }

      // Validate and transform the data
      const matches = jsonData.map((row: any, index) => {
        if (!row || typeof row !== 'object') {
          throw new Error(`Row ${index + 2}: Invalid row data`);
        }

        // Check required fields
        const rowNum = index + 2; // Add 2 because Excel starts at 1 and we have a header row
        const missingFields = [];
        
        if (!row.time) missingFields.push('time');
        if (!row.court) missingFields.push('court');
        if (!row.team1) missingFields.push('team1');
        if (!row.team2) missingFields.push('team2');

        if (missingFields.length > 0) {
          throw new Error(`Row ${rowNum}: Missing required fields: ${missingFields.join(', ')}`);
        }

        // Optional fields with default values
        const tournament_name = row.tournament_name || '';
        const day_date = row.day_date || '';

        // Validate court number
        const court = Number(row.court);
        if (isNaN(court) || court < 1) {
          throw new Error(`Row ${rowNum}: Invalid court number. Must be a positive number`);
        }

        // Validate time format (00:00:00)
        const timeStr = String(row.time).trim();
        if (!/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) {
          throw new Error(`Row ${rowNum}: Invalid time format. Use 00:00:00 format (e.g., 13:00:00)`);
        }

        // Validate team names
        if (typeof row.team1 !== 'string' || row.team1.trim().length === 0) {
          throw new Error(`Row ${rowNum}: Team 1 name must be a non-empty string`);
        }
        if (typeof row.team2 !== 'string' || row.team2.trim().length === 0) {
          throw new Error(`Row ${rowNum}: Team 2 name must be a non-empty string`);
        }

        return {
          tournament_name,
          day_date,
          time: timeStr,
          court,
          team1: String(row.team1).trim(),
          team2: String(row.team2).trim()
        };
      });

      if (matches.length === 0) {
        throw new Error('No valid matches found in the Excel file');
      }

      onMatchesExtracted(matches);
    } catch (err) {
      console.error('Error processing Excel file:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred while processing the Excel file');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError(null);

      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
      ];

      if (!validTypes.includes(file.type)) {
        throw new Error('Please upload an Excel file (.xlsx or .xls)');
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File is too large. Please upload a file smaller than 5MB');
      }

      if (file.size === 0) {
        throw new Error('The selected file is empty');
      }

      await processExcel(file);
    } catch (err) {
      console.error('Error handling file:', err);
      setError(err instanceof Error ? err.message : 'Failed to process the Excel file');
    }
  };

  const downloadTemplate = () => {
    try {
      // Create a new workbook
      const wb = XLSX.utils.book_new();
      
      // Create sample data based on the provided format
      const data = [
        // Saturday matches
        { tournament_name: 'Herren 45 - 2. Bundesliga Playdowns', day_date: '2024-01-25', time: '13:00:00', court: 1, team1: 'PB Westfalen', team2: 'PC Dortmund' },
        { tournament_name: 'Herren 45 - 2. Bundesliga Playdowns', day_date: '2024-01-25', time: '13:00:00', court: 2, team1: 'PB Westfalen', team2: 'PC Dortmund' },
        { tournament_name: 'Herren 45 - 2. Bundesliga Playdowns', day_date: '2024-01-25', time: '13:00:00', court: 3, team1: 'Crefelder HTC 3', team2: 'Alsdorf' },
        { tournament_name: 'Herren 45 - 2. Bundesliga Playdowns', day_date: '2024-01-25', time: '14:00:00', court: 1, team1: 'PB Westfalen', team2: 'PC Dortmund' },
        { tournament_name: 'Herren 45 - 2. Bundesliga Playdowns', day_date: '2024-01-25', time: '14:00:00', court: 2, team1: 'Crefelder HTC 3', team2: 'Alsdorf' },
        { tournament_name: 'Herren 45 - 2. Bundesliga Playdowns', day_date: '2024-01-25', time: '14:00:00', court: 3, team1: 'Crefelder HTC 3', team2: 'Alsdorf' },
        // Add more matches following the same pattern...
      ];
      
      // Convert data to worksheet
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Schedule');
      
      // Save the file
      XLSX.writeFile(wb, 'tournament-schedule-template.xlsx');
    } catch (err) {
      console.error('Error creating template:', err);
      setError('Failed to create template file. Please try again');
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="file"
          onChange={handleFileChange}
          accept=".xlsx,.xls"
          disabled={loading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <div className={`
          flex items-center justify-center gap-2 p-8 border-2 border-dashed
          rounded-lg text-center transition-colors
          ${loading ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-white/20 hover:border-white/40'}
        `}>
          {loading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              <div>Processing Excel file...</div>
            </>
          ) : (
            <>
              <FileSpreadsheet className="h-6 w-6" />
              <div>
                <div>Click or drag Excel file</div>
                <div className="text-sm text-white/60">Supports XLSX, XLS (max 5MB)</div>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 text-red-200 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-2">
        <div className="text-sm text-white/60">Required columns:</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-sm">
          <div className="bg-black/20 p-2 rounded">
            <div className="font-medium">tournament_name</div>
            <div className="text-white/60">Optional</div>
          </div>
          <div className="bg-black/20 p-2 rounded">
            <div className="font-medium">day_date</div>
            <div className="text-white/60">Optional, YYYY-MM-DD</div>
          </div>
          <div className="bg-black/20 p-2 rounded">
            <div className="font-medium">time</div>
            <div className="text-white/60">Required, 00:00:00</div>
          </div>
          <div className="bg-black/20 p-2 rounded">
            <div className="font-medium">court</div>
            <div className="text-white/60">Required, number</div>
          </div>
          <div className="bg-black/20 p-2 rounded">
            <div className="font-medium">team1</div>
            <div className="text-white/60">Required</div>
          </div>
          <div className="bg-black/20 p-2 rounded">
            <div className="font-medium">team2</div>
            <div className="text-white/60">Required</div>
          </div>
        </div>

        <div className="mt-4 bg-black/20 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Example Schedule Format:</h4>
          <pre className="text-sm text-white/80 overflow-x-auto">
{`tournament_name        | day_date   | time     | court | team1        | team2
---------------------|------------|----------|-------|--------------|-------------
Herren 45 Playdowns  | 2024-01-25 | 13:00:00 | 1     | PB Westfalen | PC Dortmund
Herren 45 Playdowns  | 2024-01-25 | 13:00:00 | 2     | PB Westfalen | PC Dortmund
Herren 45 Playdowns  | 2024-01-25 | 13:00:00 | 3     | Crefelder HTC| Alsdorf`}
          </pre>
        </div>

        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors text-sm mt-4"
        >
          <Upload className="h-4 w-4" />
          Download Template
        </button>
      </div>
    </div>
  );
}