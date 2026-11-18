import { useRef, useState } from 'react';
import api, { apiError } from '../api';
import { useToast } from './ui';

const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#e2e8f0"/><text x="100" y="115" text-anchor="middle" font-family="Arial" font-size="16" fill="#64748b">No image</text></svg>'
  );

export default function ImageUpload({ value = '', fileId = '', onChange, label = 'Image' }) {
  const [busy, setBusy] = useState(false);
  const [auth, setAuth] = useState(null);
  const inputRef = useRef(null);
  const toast = useToast();

  const getAuth = async () => {
    if (auth && auth.expire * 1000 > Date.now() + 60_000) return auth;
    const { data } = await api.get('/upload/auth');
    setAuth(data.data);
    return data.data;
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      await api.post('/upload/validate', { name: file.name, type: file.type, size: file.size });
      const params = await getAuth();
      const form = new FormData();
      form.append('file', file);
      form.append('fileName', file.name.replace(/[^a-zA-Z0-9._-]/g, '_'));
      form.append('publicKey', params.publicKey);
      form.append('token', params.token);
      form.append('expire', String(params.expire));
      form.append('signature', params.signature);

      const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
        method: 'POST',
        body: form,
      });
      const uploaded = await response.json();
      if (!response.ok) throw new Error(uploaded.message || 'Image upload failed');

      if (fileId && fileId !== uploaded.fileId) {
        await api.delete(`/upload/${fileId}`).catch(() => {});
      }
      onChange({ url: uploaded.url, fileId: uploaded.fileId });
      toast.success('Image uploaded');
    } catch (error) {
      toast.error(apiError(error));
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  };

  const remove = async () => {
    if (fileId) await api.delete(`/upload/${fileId}`).catch(() => {});
    onChange({ url: '', fileId: '' });
  };

  return (
    <div className="image-upload">
      <span className="field-label">{label}</span>
      <div className="image-preview">
        <img src={value || PLACEHOLDER} alt="Preview" />
        {busy && <div className="preview-busy">Uploading...</div>}
      </div>
      <div className="image-actions">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          onChange={handleFile}
          hidden
        />
        <button type="button" className="btn small" disabled={busy} onClick={() => inputRef.current?.click()}>
          {value ? 'Replace image' : 'Upload image'}
        </button>
        {value && (
          <button type="button" className="btn small ghost" disabled={busy} onClick={remove}>
            Remove
          </button>
        )}
        <small>JPG, PNG, WebP, GIF or AVIF · max 5 MB</small>
      </div>
    </div>
  );
}
