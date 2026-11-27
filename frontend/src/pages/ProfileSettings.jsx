import { useEffect, useRef, useState } from "react";
import api, { apiError, formatDate } from "../api";
import { useAuth } from "../auth/AuthContext";
import { Field, Loading, Modal, useToast } from "../components/ui";

const EMAIL_EDITABLE = true;
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIELD_LABELS = { name: "Name", email: "Email", phone: "Phone" };
const ROLE_LABELS = {
  admin: "Admin",
  warehouseManager: "Warehouse Manager",
  supplier: "Supplier",
  salesRepresentative: "Sales Representative",
};

const ProfileIcon = ({ name }) => {
  const paths = {
    user: (
      <>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    phone: (
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    ),
    pencil: (
      <>
        <path d="M4 20h4L18 10l-4-4L4 16v4z" />
        <path d="M13 7l4 4" />
      </>
    ),
    check: <path d="M20 6L9 17l-5-5" />,
    close: <path d="M18 6L6 18M6 6l12 12" />,
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    chevron: <path d="M9 6l6 6-6 6" />,
    camera: (
      <>
        <path d="M3 8h4l2-2h6l2 2h4v11H3z" />
        <circle cx="12" cy="13" r="3.5" />
      </>
    ),
    shield: <path d="M12 3l7 3v5c0 4.4-2.9 8-7 10-4.1-2-7-5.6-7-10V6l7-3z" />,
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
};

const initialsOf = (name) =>
  String(name || "?")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "?";

const emptyPasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function ProfileSettings() {
  const { user, setProfile } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState("");
  const [draft, setDraft] = useState("");
  const [editError, setEditError] = useState("");
  const [savingField, setSavingField] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [passwordError, setPasswordError] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        image: user.image || "",
        imageFileId: user.imageFileId || "",
      });
    }
  }, [user]);

  if (!form) return <Loading />;

  const rows = [
    { key: "name", icon: "user", label: "Name", value: form.name },
    {
      key: "email",
      icon: "mail",
      label: "Email",
      value: form.email,
      editable: EMAIL_EDITABLE,
    },
    { key: "phone", icon: "phone", label: "Phone", value: form.phone || "-" },
  ];

  const validateField = (field, value) => {
    const clean = String(value || "").trim();
    if (field === "name" && !clean) return "Name is required.";
    if (field === "email" && !EMAIL_PATTERN.test(clean)) {
      return "Enter a valid email address.";
    }
    if (field === "phone" && clean && !/^[+\d][\d\s()-]*$/.test(clean)) {
      return "Enter a valid phone number.";
    }
    return "";
  };

  const startEdit = (field) => {
    setEditing(field);
    setDraft(form[field] || "");
    setEditError("");
  };

  const cancelEdit = () => {
    setEditing("");
    setDraft("");
    setEditError("");
  };

  const saveField = async () => {
    const field = editing;
    if (!field || savingField) return;
    const value = String(draft || "").trim();
    const validation = validateField(field, value);
    if (validation) {
      setEditError(validation);
      return;
    }

    setSavingField(field);
    setEditError("");
    try {
      const { data } = await api.put("/users/me", { [field]: value });
      setProfile(data.data);
      setForm((current) => ({ ...current, [field]: data.data[field] ?? value }));
      toast.success(`${FIELD_LABELS[field]} updated`);
      cancelEdit();
    } catch (err) {
      const message = apiError(err);
      setEditError(message);
      toast.error(message);
    } finally {
      setSavingField("");
    }
  };

  const handleEditKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveField();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
    }
  };

  const uploadPhoto = async (file) => {
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError("");
    try {
      await api.post("/upload/validate", {
        name: file.name,
        type: file.type,
        size: file.size,
      });
      const { data: authData } = await api.get("/upload/auth", {
        params: { _: Date.now() },
      });
      const params = authData.data;
      const uploadForm = new FormData();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      uploadForm.append("file", file);
      uploadForm.append("fileName", `${Date.now()}-${safeName}`);
      uploadForm.append("useUniqueFileName", "true");
      uploadForm.append("publicKey", params.publicKey);
      uploadForm.append("token", params.token);
      uploadForm.append("expire", String(params.expire));
      uploadForm.append("signature", params.signature);

      const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
        method: "POST",
        body: uploadForm,
      });
      const uploaded = await response.json();
      if (!response.ok) {
        throw new Error(uploaded.message || "Image upload failed");
      }

      if (form.imageFileId && form.imageFileId !== uploaded.fileId) {
        await api.delete(`/upload/${form.imageFileId}`).catch(() => {});
      }
      const { data } = await api.put("/users/me", {
        image: uploaded.url,
        imageFileId: uploaded.fileId,
      });
      setProfile(data.data);
      setForm((current) => ({
        ...current,
        image: data.data.image,
        imageFileId: data.data.imageFileId,
      }));
      toast.success("Profile photo updated");
    } catch (err) {
      const message = apiError(err);
      setPhotoError(message);
      toast.error(message);
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    if (photoBusy || !form.image) return;
    setPhotoBusy(true);
    setPhotoError("");
    try {
      if (form.imageFileId) {
        await api.delete(`/upload/${form.imageFileId}`).catch(() => {});
      }
      const { data } = await api.put("/users/me", { image: "", imageFileId: "" });
      setProfile(data.data);
      setForm((current) => ({
        ...current,
        image: data.data.image,
        imageFileId: data.data.imageFileId,
      }));
      toast.success("Profile photo removed");
    } catch (err) {
      const message = apiError(err);
      setPhotoError(message);
      toast.error(message);
    } finally {
      setPhotoBusy(false);
    }
  };

  const closePassword = () => {
    setPasswordOpen(false);
    setPasswordError("");
    setPasswordForm(emptyPasswordForm);
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    if (passwordBusy) return;
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword) {
      setPasswordError("Current password is required.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordBusy(true);
    setPasswordError("");
    try {
      await api.put("/auth/password", passwordForm);
      toast.success("Password updated");
      closePassword();
    } catch (err) {
      const message = apiError(err);
      setPasswordError(message);
      toast.error(message);
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <div className="profile-page">
      <section className="profile-card">
        <div className="profile-photo-block">
          <div className="profile-avatar-wrap">
            {form.image ? (
              <img
                className="profile-avatar"
                src={form.image}
                alt={`${form.name} profile`}
              />
            ) : (
              <div className="profile-avatar profile-avatar-initials">
                {initialsOf(form.name)}
              </div>
            )}
            {photoBusy && (
              <div className="profile-avatar-busy">
                <span className="spinner" />
              </div>
            )}
            <button
              type="button"
              className="profile-camera"
              title="Change profile photo"
              aria-label="Change profile photo"
              disabled={photoBusy}
              onClick={() => fileRef.current?.click()}
            >
              <ProfileIcon name="camera" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept={IMAGE_ACCEPT}
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) uploadPhoto(file);
              }}
            />
          </div>
          {form.image && (
            <button
              type="button"
              className="profile-remove-photo"
              disabled={photoBusy}
              onClick={removePhoto}
            >
              Remove photo
            </button>
          )}
          {photoError && <small className="profile-error">{photoError}</small>}
        </div>

        <div className="profile-details">
          <div className="profile-list">
            {rows.map((row) => (
              <div className="profile-row" key={row.key}>
                <span className="profile-row-icon">
                  <ProfileIcon name={row.icon} />
                </span>
                <div className="profile-row-body">
                  <span className="profile-row-label">{row.label}</span>
                  {editing === row.key ? (
                    <div className="profile-edit-wrap">
                      <div className="profile-edit-form">
                        <input
                          autoFocus
                          value={draft}
                          onChange={(event) => {
                            setDraft(event.target.value);
                            setEditError("");
                          }}
                          onKeyDown={handleEditKeyDown}
                          aria-label={`Edit ${row.label}`}
                        />
                        <div className="profile-edit-actions">
                          <button
                            type="button"
                            title="Save"
                            aria-label={`Save ${row.label}`}
                            disabled={Boolean(savingField)}
                            onClick={saveField}
                          >
                            <ProfileIcon name="check" />
                          </button>
                          <button
                            type="button"
                            title="Cancel"
                            aria-label={`Cancel editing ${row.label}`}
                            disabled={Boolean(savingField)}
                            onClick={cancelEdit}
                          >
                            <ProfileIcon name="close" />
                          </button>
                        </div>
                      </div>
                      {editError && (
                        <small className="profile-error">{editError}</small>
                      )}
                    </div>
                  ) : (
                    <span className="profile-row-value">{row.value}</span>
                  )}
                </div>
                {editing !== row.key &&
                  (row.editable === false ? (
                    <span
                      className="profile-row-edit locked"
                      title="Email cannot be changed"
                      aria-label="Email cannot be changed"
                    >
                      <ProfileIcon name="lock" />
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="profile-row-edit"
                      title={`Edit ${row.label}`}
                      aria-label={`Edit ${row.label}`}
                      onClick={() => startEdit(row.key)}
                    >
                      <ProfileIcon name="pencil" />
                    </button>
                  ))}
              </div>
            ))}
            <div className="profile-row">
              <span className="profile-row-icon">
                <ProfileIcon name="shield" />
              </span>
              <div className="profile-row-body">
                <span className="profile-row-label">Role</span>
                <span className="profile-role-badge">
                  {ROLE_LABELS[user.role] || user.role}
                </span>
              </div>
            </div>
          </div>

          <p className="profile-member-since">
            Member since {formatDate(user.createdAt)}
          </p>
          <button
            type="button"
            className="profile-action-row"
            onClick={() => {
              setPasswordError("");
              setPasswordOpen(true);
            }}
          >
            <span className="profile-row-icon">
              <ProfileIcon name="lock" />
            </span>
            <span className="profile-action-label">Change password</span>
            <span className="profile-chevron">
              <ProfileIcon name="chevron" />
            </span>
          </button>
        </div>
      </section>

      <Modal
        open={passwordOpen}
        onClose={closePassword}
        title="Change password"
        className="user-modal password-modal"
      >
        <form className="stack-form" onSubmit={submitPassword}>
          <Field label="Current password" required>
            <input
              type="password"
              autoComplete="current-password"
              value={passwordForm.currentPassword}
              onChange={(event) =>
                setPasswordForm({
                  ...passwordForm,
                  currentPassword: event.target.value,
                })
              }
            />
          </Field>
          <Field label="New password" required hint="At least 6 characters">
            <input
              type="password"
              autoComplete="new-password"
              value={passwordForm.newPassword}
              onChange={(event) =>
                setPasswordForm({
                  ...passwordForm,
                  newPassword: event.target.value,
                })
              }
            />
          </Field>
          <Field label="Confirm password" required>
            <input
              type="password"
              autoComplete="new-password"
              value={passwordForm.confirmPassword}
              onChange={(event) =>
                setPasswordForm({
                  ...passwordForm,
                  confirmPassword: event.target.value,
                })
              }
            />
          </Field>
          {passwordError && (
            <small className="profile-error">{passwordError}</small>
          )}
          <div className="form-actions">
            <button
              type="button"
              className="btn ghost"
              disabled={passwordBusy}
              onClick={closePassword}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn primary"
              disabled={passwordBusy}
            >
              {passwordBusy ? "Updating..." : "Update password"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
