/**
 * Utility to download CSV files in the browser
 */

export function downloadCsvFile(content, fileName = 'export.csv') {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportResultsToCsv(resultsByCategory, categories, fileName = 'fts_competition_results.csv') {
  const rows = [
    [
      'Rank',
      'Category Name',
      'Category Code',
      'Chest Number',
      'Performer Name',
      'Registration Number',
      'Act / Routine',
      'Judge Score (0-100)',
      'Judge Weight (85%)',
      'Audience Votes Count',
      'Audience Score (%)',
      'Audience Weight (15%)',
      'Final Calculated Score'
    ]
  ];

  for (const catId of Object.keys(resultsByCategory)) {
    const cat = categories.find(c => c.id === catId);
    const catResults = resultsByCategory[catId] || [];
    for (const r of catResults) {
      rows.push([
        r.rank,
        `"${cat?.name || catId}"`,
        `"${cat?.code || cat?.prefix || ''}"`,
        `"${r.participantCode || ''}"`,
        `"${r.participantName || ''}"`,
        `"${r.registrationNumber || ''}"`,
        `"${(r.act || '').replace(/"/g, '""')}"`,
        r.judgeScore,
        '85%',
        r.audienceVotesCount || 0,
        `${r.audienceScore || 0}%`,
        '15%',
        r.finalScore
      ]);
    }
  }

  const csvString = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
  downloadCsvFile(csvString, fileName);
}

export function exportVotesToCsv(votes, categories, fileName = 'fts_audience_ballots.csv') {
  const rows = [
    [
      'Vote ID',
      'Category Name',
      'Category Code',
      'Performer Chest Number',
      'Performer Name',
      'Performer Registration Number',
      'Voter User ID',
      'Voter Name',
      'Voter Email',
      'Vote Timestamp'
    ]
  ];

  for (const v of votes) {
    const cat = categories.find(c => c.id === v.categoryId);
    rows.push([
      `"${v.id}"`,
      `"${cat?.name || v.categoryName || v.categoryId}"`,
      `"${cat?.code || cat?.prefix || v.categoryCode || ''}"`,
      `"${v.participantCode || ''}"`,
      `"${v.participantName || ''}"`,
      `"${v.registrationNumber || ''}"`,
      `"${v.audienceId || ''}"`,
      `"${v.voterName || 'Audience Member'}"`,
      `"${v.voterEmail || 'N/A'}"`,
      `"${new Date(v.submittedAt).toLocaleString()}"`
    ]);
  }

  const csvString = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
  downloadCsvFile(csvString, fileName);
}
