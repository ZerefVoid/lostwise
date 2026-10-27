import { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { Ctx } from '../context.js';
import { api } from '../api.js';

// Claim chat between the finder and the claimant.
// id: claim id, me: current user id, fin: I am the finder, ro: read-only (admin)
export default function Chat({ id, me, fin, ro, reload, go }) {
  const D = useContext(Ctx);
  const [claim, setClaim] = useState();
  const [message, setMessage] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const lastId = useRef(0);
  const messageBox = useRef();

  // Fetch the claim and any messages not received yet
  const load = useCallback(async () => {
    setClaim(await api('/claims/' + id));

    const incoming = await api(`/claims/${id}/messages?after=${lastId.current}`);
    if (incoming.length) {
      lastId.current = incoming[incoming.length - 1].id;
      setMessage((old) => [...old, ...incoming]);
    }
  }, [id]);

  // Load on open, then check for new messages every 3 seconds
  useEffect(() => {
    lastId.current = 0;
    setMessage([]);
    load();
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [load]);

  // Auto-scroll to the latest message
  useEffect(() => {
    if (messageBox.current) messageBox.current.scrollTop = 1e9;
  }, [message]);

  // Send an action to the server (message, choose, reject), then reload
  const action = (path, body) => async () => {
    try {
      await api(`/claims/${id}/${path}`, { body: body || {} });
      await load();
      reload();
    } catch (x) {
      setError(x.message);
    }
  };

  const sendMessage = async () => {
    if (!text.trim()) return;
    await action('message', { body: text })();
    setText('');
  };

  if (!claim) return null;

  const chatOpen = ['chat', 'chosen'].includes(claim.status);

  let banner;
  if (claim.status === 'chosen') {
    banner = (
      <div className="warnb" style={{ background: 'var(--mint)', color: 'var(--acc2)' }}>
        <b>Owner verified.</b> Continue the conversation in the chat on this website to arrange the handover.
      </div>
    );
  } else if (chatOpen) {
    banner = (
      <div className="info">
        {fin
          ? 'Do not reveal the secret feature. Ask, then let the claimant answer.'
          : 'The finder will ask about the item. Answer from memory.'}
      </div>
    );
  } else {
    banner = <div className="info">Claim {claim.status}.</div>;
  }

  return (
    <>
      {banner}
      {error && <div className="sm" style={{ color: 'var(--redfg)' }}>{error}</div>}

      <div className="msgs" ref={messageBox}>
        {message.length ? (
          message.map((m) => {
            const isMine = m.sender_id === me;
            return (
              <div key={m.id} className={'bub ' + (isMine ? 'me' : '')}>
                <span className="who">
                  {isMine ? 'You' : fin ? claim.claimant_name : 'Finder'}
                </span>
                {m.body}
              </div>
            );
          })
        ) : (
          <div className="sm">No messages yet.</div>
        )}
      </div>

      {chatOpen && !ro && (
        <div className="crow">
          <input
            className="inp"
            placeholder="Write a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button className="btn pri" onClick={sendMessage}>Send</button>
        </div>
      )}

      {/* Finder: choose or reject the claimant */}
      {fin && !ro && claim.status === 'chat' && (
        <div className="lbtns">
          <button className="btn pri" onClick={action('choose')}>Choose owner</button>
          <button className="btn net" onClick={action('reject')}>Reject</button>
        </div>
      )}

      {/* Finder: handover after the owner is chosen */}
      {fin && !ro && claim.status === 'chosen' && (
        <div className="lbtns">
          <button className="btn pri" onClick={() => go('handover', id)}>Hand over item</button>
          <button
            className="btn warn"
            onClick={() =>
              D.setDlg({ t: 'cancel_handover', id, rid: claim.found_report_id, name: claim.title })
            }
          >
            Cancel handover
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          className="btn warn"
          onClick={() => D.setDlg({ t: 'rpt', id: claim.found_report_id })}
        >
          Report
        </button>
      </div>
    </>
  );
}
