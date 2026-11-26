// Create / edit profile dialog. Resolves { action: 'save', data } | { action: 'delete' } | null.
export function openProfileDialog(profile, canDelete) {
  const dlg = document.querySelector('#profileDlg'), $ = (s) => dlg.querySelector(s);
  $('h2').textContent = profile ? 'Edit profile' : 'New profile';
  $('#pName').value = profile?.name ?? ''; $('#pBalance').value = profile?.balance ?? 10000; $('#pLev').value = profile?.leverage ?? 100;
  $('#pDelete').hidden = !profile || !canDelete; $('#pErr').textContent = '';
  dlg.showModal();
  return new Promise((resolve) => {
    $('#pSave').onclick = () => {
      const data = { name: $('#pName').value.trim(), balance: +$('#pBalance').value, leverage: +$('#pLev').value };
      if (!data.name || !(data.balance >= 100) || !(data.leverage >= 1 && data.leverage <= 1000)) return ($('#pErr').textContent = 'Name, balance (100+) and leverage (1–1000) are required');
      dlg.close(); resolve({ action: 'save', data });
    };
    $('#pDelete').onclick = () => { if (confirm('Delete this profile and all its trades?')) { dlg.close(); resolve({ action: 'delete' }); } };
    $('#pCancel').onclick = () => { dlg.close(); resolve(null); };
  });
}
