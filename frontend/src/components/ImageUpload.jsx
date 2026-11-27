import { useRef, useState } from 'react';
import api, { apiError } from '../api';
import { useToast } from './ui';

const HINT = 'JPG, PNG, WebP, GIF or AVIF · max 5 MB';

export default function ImageUpload({ value = '', fileId = '', onChange, label = 'Image', required = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const toast = useToast();

  const getAuth = async () => {
    const { data } = await api.get('/upload/auth', { params: { _: Date.now() } });
    return data.data;
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      await api.post('/upload/validate', { name: file.name, type: file.type, size: file.size });
      const params = await getAuth();
      const form = new FormData();
      form.append('file', file);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      form.append('fileName', `${Date.now()}-${safeName}`);
      form.append('useUniqueFileName', 'true');
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
    } catch (uploadError) {
      const message = apiError(uploadError);
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  };

  const remove = async () => {
    if (busy) return;
    if (fileId) await api.delete(`/upload/${fileId}`).catch(() => {});
    onChange({ url: '', fileId: '' });
    setError('');
  };

  const openPicker = () => {
    if (!busy) inputRef.current?.click();
  };

  const handleDropzoneKeyDown = (event) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPicker();
    }
  };

  return (
    <div className="image-upload">
      <span className="field-label">
        {label}
        {required && <em> *</em>}
      </span>
      <div
        className={`image-dropzone${value ? ' has-image' : ''}${busy ? ' is-busy' : ''}`}
        role="button"
        tabIndex={busy ? -1 : 0}
        aria-label={value ? 'Replace image' : 'Upload image'}
        onClick={openPicker}
        onKeyDown={handleDropzoneKeyDown}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          onChange={handleFile}
          hidden
        />
        {!value && (
          <div className="image-empty">
            <svg
              className="upload-cloud-icon"
              viewBox="0 0 24 24"
              width="40"
              height="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M7 18h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.1 9.2 4.4 4.4 0 0 0 7 18z" />
              <path d="M12 16V9" />
              <path d="M9.5 11.5L12 9l2.5 2.5" />
            </svg>
            <strong>Upload image</strong>
            <small>{HINT}</small>
          </div>
        )}
        {value && <img className="image-dropzone-preview" src={value} alt="Preview" />}
        {value && !busy && (
          <div className="image-dropzone-actions">
            <button
              type="button"
              className="image-action-button"
              onClick={(event) => {
                event.stopPropagation();
                openPicker();
              }}
            >
              Replace
            </button>
            <button
              type="button"
              className="image-action-button remove"
              onClick={(event) => {
                event.stopPropagation();
                remove();
              }}
            >
              Remove
            </button>
          </div>
        )}
        {busy && <div className="preview-busy">Uploading...</div>}
      </div>
      {error && <small className="image-upload-error">{error}</small>}
    </div>
  );
}
