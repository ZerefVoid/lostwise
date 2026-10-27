import { useState, useEffect, useContext } from 'react';
import { Ctx } from '../context.js';
import { api } from '../api.js';
import { ITEM_POSITIONS } from '../constants.js';
import { fmt } from '../utils.js';
import usePhoto from '../hooks/usePhoto.js';
import PhotoDrop from '../components/PhotoDrop.jsx';

// Handover page. id = id of the claim the finder chose
export default function Handover({ id, go }) {
  const D = useContext(Ctx);
  const [claim, setClaim] = useState();
  const [report, setReport] = useState();
  const photo = usePhoto();

  useEffect(() => {
    api('/claims/' + id).then((k) => {
      setClaim(k);
      api('/reports/' + k.found_report_id).then(setReport);
    });
  }, [id]);

  if (!claim || !report) return <div className="pg"><div className="panel">Loading...</div></div>;

  const confirm = async () => {
    try {
      const form = new FormData();
      if (photo.file) form.append('photo', photo.file);
      await api(`/claims/${id}/handover`, { body: form });
      go('detail', report.id);
    } catch (x) {
      D.setDlg({ t: 'ok', title: 'Failed', msg: x.message });
    }
  };

  const cancel = () => D.setDlg({ t: 'cancel_handover', id, rid: report.id, name: report.title });

  return (
    <div className="w960">
      <h1 className="pt">Hand over item</h1>
      <p className="subt">Confirm once the item has changed hands to the owner.</p>

      <div className="two" style={{ marginTop: 20 }}>
        {/* Left: report summary */}
        <div className="panel">
          <span className="badge s-claim_in_progress">Claim in progress</span>
          <h2 style={{ fontSize: 22, margin: '10px 0' }}>{report.title}</h2>

          <div className="rows">
            <div><b>Chosen owner</b><span>{claim.claimant_name}</span></div>
            <div><b>Item location</b><span>{ITEM_POSITIONS[report.item_position]}</span></div>
            <div><b>Report created</b><span>{fmt(report.created_at)}</span></div>
          </div>

          <div className="stp"><i className="d">✓</i>Owner verified through chat</div>
          <div className="stp"><i className="c">2</i>Hand over the item and confirm here</div>
          <div className="stp"><i>3</i>Report becomes Returned</div>
        </div>

        {/* Right: handover proof photo */}
        <div className="panel stk">
          <div className="sbar">
            <h2 style={{ fontSize: 22 }}>Handover proof photo</h2>
            <span className="badge s-found" style={{ fontSize: 13 }}>Earns 10 points</span>
          </div>

          <PhotoDrop
            room="pr"
            text="Drop a photo here or take one with your camera"
            preview={photo.preview}
            onPick={photo.choose}
          />

          <div className="sm">Photo of the item at handover. Cover the name, student number and card number.</div>

          <button className="btn pri lg" onClick={confirm}>Handed over</button>
          <button className="btn net lg" onClick={() => go('detail', report.id)}>Back to chat</button>
          <button className="btn warn lg" onClick={cancel}>Cancel handover</button>
        </div>
      </div>
    </div>
  );
}
