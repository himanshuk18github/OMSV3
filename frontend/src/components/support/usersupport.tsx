import React, { useContext, useEffect, useState } from "react";
import API_BASE_URL from '../../apicallconfig';

import {
  Box,
  Typography,
  Card,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Avatar,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Divider,
  Pagination,
  InputAdornment,
} from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import ReplyIcon from "@mui/icons-material/Reply";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import { AuthContext } from "../../context/AuthContext";

function useTailwindDarkMode() {
  const [isDark, setIsDark] = useState(
    typeof window !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

const BUTTON_COLOR = "#465fff";
const CARD_SIZE = { width: 220, height: 180 };
const TICKETS_PER_PAGE = 10;
const API = `${API_BASE_URL}/support.php`;
const ATTACH_BASE = "https://app.apnistationery.com/api/tickets_media/";

type Ticket = {
  id: number;
  ticket_number: string;
  username: string;
  subject: string;
  message: string;
  reference_number: string;
  attachment?: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
  admin_reply?: string;
  admin_attachment?: string;
};

const SUBJECTS = [
  "Issue while Scanning",
  "Issue in Report",
  "Issue in Updating Details",
  "Issue with login",
  "Other",
];

export default function UserSupport() {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.username?.toLowerCase() === "admin";
  const isDark = useTailwindDarkMode();

  const [stats, setStats] = useState({ pending: 0 });
  const [showCreate, setShowCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createDone, setCreateDone] = useState(false);
  const [createError, setCreateError] = useState("");
  const [popupTicketNum, setPopupTicketNum] = useState<string | null>(null);

  // Create ticket form
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [refNum, setRefNum] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  // Tickets
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [replyView, setReplyView] = useState<Ticket | null>(null);

  // Pagination and search
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Admin reply popup
  const [adminReplyId, setAdminReplyId] = useState<number | null>(null);
  const [adminMsg, setAdminMsg] = useState("");
  const [adminFile, setAdminFile] = useState<File | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminStatus, setAdminStatus] = useState<"answered" | "pending">("answered");

  useEffect(() => {
    fetch(API + "?action=stats", { credentials: "include" })
      .then((r) => r.json())
      .then(data => setStats({ pending: data.pending || 0 }));
  }, [createDone, adminLoading]);

  // Fetch all tickets for this user (or admin)
  useEffect(() => {
    let url = `${API}?action=history&username=${encodeURIComponent(user?.username || "")}&admin=${isAdmin ? "1" : "0"}`;
    fetch(url, { credentials: "include" })
      .then((r) => r.json())
      .then((data: Ticket[]) => setAllTickets(data));
  }, [createDone, adminLoading, user, isAdmin]);

  // Pagination and search logic
  const filteredTickets = allTickets.filter(t =>
    (t.ticket_number?.toLowerCase().includes(search.toLowerCase()) ||
      t.subject?.toLowerCase().includes(search.toLowerCase()) ||
      t.status?.toLowerCase().includes(search.toLowerCase()) ||
      t.message?.toLowerCase().includes(search.toLowerCase()))
  );
  const countPages = Math.max(1, Math.ceil(filteredTickets.length / TICKETS_PER_PAGE));
  const currentPageTickets = filteredTickets.slice(
    (page - 1) * TICKETS_PER_PAGE,
    page * TICKETS_PER_PAGE
  );

  // Reset page to 1 if search or ticket list changes
  useEffect(() => {
    setPage(1);
  }, [search, allTickets.length]);

  // Create ticket handler
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreateLoading(true);

    const formData = new FormData();
    formData.append("action", "new_ticket");
    formData.append("username", user?.username || "");
    formData.append("subject", subject);
    formData.append("message", message);
    formData.append("reference_number", refNum);
    formData.append("created_by", user?.username || "");
    if (attachment) formData.append("attachment", attachment);

    const res = await fetch(API, {
      method: "POST",
      credentials: "include",
      body: formData,
    }).then((r) => r.json());

    setCreateLoading(false);
    if (res.success) {
      setPopupTicketNum(res.ticket_number);
      setCreateDone(true);
      setTimeout(() => {
        setShowCreate(false);
        setCreateDone(false);
        setPopupTicketNum(null);
        setSubject("");
        setMessage("");
        setRefNum("");
        setAttachment(null);
      }, 1800);
    } else {
      setCreateError(res.error || "Failed to submit ticket.");
    }
  };

  const handleAdminReply = async (ticketId: number) => {
    setAdminLoading(true);

    const formData = new FormData();
    formData.append("action", "admin_reply");
    formData.append("id", String(ticketId));
    formData.append("admin_reply", adminMsg);
    formData.append("updated_by", user?.username || "");
    if (adminFile) formData.append("admin_attachment", adminFile);

    const res = await fetch(API, {
      method: "POST",
      credentials: "include",
      body: formData,
    }).then((r) => r.json());

    if (res.success && adminStatus) {
      await fetch(API, {
        method: "POST",
        credentials: "include",
        body: new URLSearchParams({
          action: "update_status",
          id: String(ticketId),
          status: adminStatus,
          updated_by: user?.username || "",
        }),
      });
    }

    setAdminLoading(false);
    setAdminReplyId(null);
    setAdminMsg("");
    setAdminFile(null);
    setAdminStatus("answered");
  };

  const cardBg = isDark ? "#181F2A" : "#fff";
  const cardText = isDark ? "#fff" : "#353535";
  const mutedText = isDark ? "#bfc7d1" : "#666";
  const pageBg = isDark ? "#101828" : "#f9fafb";

  const renderAttachment = (file: string | undefined) =>
    file ? (
      <Button
        variant="text"
        size="small"
        color="primary"
        startIcon={<AttachFileIcon />}
        href={ATTACH_BASE + file}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ textTransform: "none" }}
      >
        View Attachment
      </Button>
    ) : (
      <Typography variant="caption" color="text.secondary">
        No Attachment
      </Typography>
    );

  function getInitials(name: string) {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function SupportReplyChat({ ticket }: { ticket: Ticket }) {
    return (
      <Box sx={{ p: 1 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", mb: 3 }}>
          <Avatar
            sx={{
              width: 50,
              height: 50,
              fontWeight: 700,
              fontSize: 22,
              bgcolor: BUTTON_COLOR,
              mr: 2,
            }}
          >
            {getInitials(ticket.username)}
          </Avatar>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {ticket.username}
            </Typography>
            <Box
              sx={{
                bgcolor: isDark ? "#232d46" : "#f3f6fd",
                borderRadius: "14px",
                px: 2,
                py: 1.5,
                maxWidth: 340,
                mt: 0.5,
                mb: 0.5,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {ticket.subject}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {ticket.message}
              </Typography>
            </Box>
            {ticket.attachment && <Box>{renderAttachment(ticket.attachment)}</Box>}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              {new Date(ticket.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
            </Typography>
          </Box>
        </Box>
        {ticket.admin_reply && (
          <Box sx={{ display: "flex", flexDirection: "row-reverse", alignItems: "flex-start", mb: 2 }}>
            <Avatar
              sx={{
                width: 50,
                height: 50,
                fontWeight: 700,
                fontSize: 22,
                bgcolor: "#36d399",
                ml: 2,
              }}
            >
              SR
            </Avatar>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Support Reply
              </Typography>
              <Box
                sx={{
                  bgcolor: isDark ? "#1e2a23" : "#d1ffe8",
                  borderRadius: "14px",
                  px: 2,
                  py: 1.5,
                  maxWidth: 340,
                  mt: 0.5,
                  mb: 0.5,
                }}
              >
                <Typography variant="body2">{ticket.admin_reply}</Typography>
              </Box>
              {ticket.admin_attachment && <Box>{renderAttachment(ticket.admin_attachment)}</Box>}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5, display: "block", textAlign: "right" }}
              >
                {ticket.updated_at &&
                  new Date(ticket.updated_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    );
  }

  function TicketRow(t: Ticket) {
    return (
      <tr
        style={{
          borderBottom: "1px solid " + (isDark ? "#232d46" : "#eee"),
        }}
      >
        <td style={{ padding: "6px 8px" }}>{t.ticket_number}</td>
        <td style={{ padding: "6px 8px" }}>{t.subject}</td>
        <td style={{ padding: "6px 8px" }}>
          <span
            style={{
              fontWeight: 600,
              color:
                t.status === "pending"
                  ? "#ff9800"
                  : t.status === "answered"
                  ? "#36d399"
                  : "#888",
            }}
          >
            {t.status}
          </span>
        </td>
        <td style={{ padding: "6px 8px" }}>
          {new Date(t.created_at).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })}
        </td>
        <td style={{ padding: "6px 8px" }}>{renderAttachment(t.attachment)}</td>
        <td style={{ padding: "6px 8px" }}>
          <Button
            size="small"
            variant="outlined"
            sx={{
              textTransform: "none",
              borderRadius: "8px",
              color: BUTTON_COLOR,
              fontWeight: 700,
              borderColor: BUTTON_COLOR,
            }}
            onClick={() => setReplyView(t)}
            startIcon={<SupportAgentIcon />}
          >
            View Chat
          </Button>
        </td>
        {isAdmin && (
          <td style={{ padding: "6px 8px" }}>
            <Button
              size="small"
              variant="contained"
              color="primary"
              sx={{
                textTransform: "none",
                borderRadius: "8px",
                fontWeight: 700,
                bgcolor: BUTTON_COLOR,
                "&:hover": { bgcolor: "#2840c0" },
              }}
              onClick={() => setAdminReplyId(t.id)}
              startIcon={<ReplyIcon />}
            >
              Reply
            </Button>
          </td>
        )}
      </tr>
    );
  }

  return (
    <Box
      sx={{
        p: 3,
        minHeight: "100vh",
        bgcolor: pageBg,
        transition: "background 0.2s",
      }}
    >
      <Grid container spacing={3} sx={{ mb: 3 }} alignItems="stretch">
        <Grid item>
          <Card
            sx={{
              ...CARD_SIZE,
              p: "20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              borderRadius: "12px",
              boxShadow: isDark
                ? "0 4px 10px rgba(30,40,80,0.18)"
                : "0 4px 6px rgba(0,0,0,0.06)",
              border: isDark ? "1px solid #232d46" : "none",
              background: cardBg,
              color: cardText,
              transition: "background 0.2s",
            }}
          >
            <AssignmentIcon sx={{ fontSize: 40, color: BUTTON_COLOR }} />
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                textAlign: "center",
                color: cardText,
                fontSize: "15px",
              }}
            >
              Pending Tickets
            </Typography>
            <Typography
              variant="h2"
              sx={{
                color: "#ff9800",
                fontWeight: 700,
                textAlign: "center",
                fontSize: "32px",
              }}
            >
              {stats.pending}
            </Typography>
          </Card>
        </Grid>
        <Grid item>
          <Card
            sx={{
              ...CARD_SIZE,
              p: "20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              cursor: "pointer",
              borderRadius: "12px",
              boxShadow: isDark
                ? "0 4px 10px rgba(30,40,80,0.18)"
                : "0 4px 6px rgba(0,0,0,0.06)",
              border: isDark ? "1px solid #232d46" : "none",
              background: cardBg,
              color: cardText,
              transition: "background 0.2s",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: isDark
                  ? "0 6px 18px rgba(70,95,255,0.25)"
                  : "0 6px 12px rgba(0,0,0,0.08)",
                background: isDark ? "#232d46" : "#f5f7fb",
              },
            }}
            onClick={() => setShowCreate(true)}
          >
            <SupportAgentIcon sx={{ fontSize: 40, color: BUTTON_COLOR }} />
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                textAlign: "center",
                color: cardText,
                fontSize: "15px",
              }}
            >
              Generate Ticket
            </Typography>
            <Button
              variant="contained"
              sx={{
                mt: 2,
                bgcolor: BUTTON_COLOR,
                color: "#fff",
                borderRadius: "8px",
                px: 3,
                py: 1,
                fontWeight: 600,
                fontSize: 14,
                width: "100%",
                textTransform: "none",
                "&:hover": { bgcolor: "#2840c0" },
              }}
              onClick={() => setShowCreate(true)}
            >
              Generate
            </Button>
          </Card>
        </Grid>
      </Grid>
      {/* Search + All Tickets Table */}
      <Card
        sx={{
          p: 3,
          borderRadius: "14px",
          background: cardBg,
          color: isDark ? "#fff" : "#222",
          position: "relative",
          maxWidth: "100%",
          minHeight: 340,
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            All Tickets
          </Typography>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Search tickets"
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{
              bgcolor: isDark ? "#232d46" : "#f9fafb",
              borderRadius: 2,
              width: 240,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <Box sx={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "14px",
            }}
          >
            <thead>
              <tr style={{ background: isDark ? "#232d46" : "#f5f7fb" }}>
                <th style={{ padding: "6px 8px", textAlign: "left" }}>Ticket#</th>
                <th style={{ padding: "6px 8px", textAlign: "left" }}>Subject</th>
                <th style={{ padding: "6px 8px", textAlign: "left" }}>Status</th>
                <th style={{ padding: "6px 8px", textAlign: "left" }}>Created At</th>
                <th style={{ padding: "6px 8px", textAlign: "left" }}>Attachment</th>
                <th style={{ padding: "6px 8px", textAlign: "left" }}>Chat</th>
                {isAdmin && <th style={{ padding: "6px 8px", textAlign: "left" }}>Reply</th>}
              </tr>
            </thead>
            <tbody>
              {currentPageTickets.map((t) => (
                <TicketRow key={t.id} {...t} />
              ))}
              {currentPageTickets.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6}>
                    <Typography sx={{ p: 2, textAlign: "center", color: mutedText }}>
                      No tickets found
                    </Typography>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
          <Pagination
            count={countPages}
            page={page}
            onChange={(_, v) => setPage(v)}
            color="primary"
            variant="outlined"
            shape="rounded"
            size="small"
          />
        </Box>
      </Card>
      {/* Support Reply - View as Popup (User/All) */}
      <Dialog
        open={!!replyView}
        onClose={() => setReplyView(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ style: { borderRadius: 18 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          Ticket Chat
          <IconButton
            onClick={() => setReplyView(null)}
            sx={{ position: "absolute", right: 12, top: 12 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {replyView && <SupportReplyChat ticket={replyView} />}
        </DialogContent>
      </Dialog>
      {/* Admin Reply Card Popup */}
      <Dialog
        open={adminReplyId !== null}
        onClose={() => setAdminReplyId(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ style: { borderRadius: 18 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          Support Reply
          <IconButton
            onClick={() => setAdminReplyId(null)}
            sx={{ position: "absolute", right: 12, top: 12 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Reply Message"
            multiline
            minRows={3}
            maxRows={6}
            value={adminMsg}
            onChange={e => setAdminMsg(e.target.value)}
            fullWidth
            sx={{ mt: 1, mb: 2 }}
          />
          <Button
            component="label"
            variant="outlined"
            startIcon={<AttachFileIcon />}
            sx={{ mb: 2 }}
          >
            Attach File
            <input
              type="file"
              accept=".pdf,.jpeg,.jpg,.png"
              hidden
              onChange={e =>
                setAdminFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)
              }
            />
          </Button>
          {adminFile && (
            <Typography variant="caption" sx={{ ml: 1 }}>
              {adminFile.name}
            </Typography>
          )}
          <Divider sx={{ my: 2 }} />
          {/* Status dropdown */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={adminStatus}
              label="Status"
              onChange={e => setAdminStatus(e.target.value as "answered" | "pending")}
            >
              <MenuItem value="answered">Mark as Solved</MenuItem>
              <MenuItem value="pending">Mark as Pending</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdminReplyId(null)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (adminReplyId != null) handleAdminReply(adminReplyId);
            }}
            variant="contained"
            color="primary"
            disabled={!adminMsg.trim() || adminLoading}
            sx={{ bgcolor: BUTTON_COLOR, fontWeight: 700 }}
          >
            {adminLoading ? "Sending..." : "Submit Reply"}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Create Ticket Dialog */}
      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ style: { borderRadius: 18 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          Generate Ticket
          <IconButton
            onClick={() => setShowCreate(false)}
            sx={{ position: "absolute", right: 12, top: 12 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {createDone ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                minHeight: 140,
                justifyContent: "center",
              }}
            >
              <Typography
                variant="h1"
                sx={{ color: "#36d399", fontSize: 48, fontWeight: 800 }}
              >
                ✓
              </Typography>
              <Typography variant="h6" sx={{ color: "#36d399" }}>
                Ticket submitted!
              </Typography>
              {popupTicketNum && (
                <Typography variant="body1" sx={{ color: "#465fff" }}>
                  Ticket Number: <b>{popupTicketNum}</b>
                </Typography>
              )}
            </Box>
          ) : (
            <form onSubmit={handleCreateTicket}>
              <TextField
                label="User"
                value={user?.username || ""}
                disabled
                fullWidth
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Subject*</InputLabel>
                <Select
                  label="Subject*"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                >
                  <MenuItem value="">Select subject</MenuItem>
                  {SUBJECTS.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Message*"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                multiline
                minRows={3}
                fullWidth
                inputProps={{ maxLength: 1000 }}
                required
                sx={{ mb: 2 }}
              />
              <TextField
                label="Reference Number (optional)"
                value={refNum}
                onChange={(e) => setRefNum(e.target.value)}
                inputProps={{ maxLength: 50 }}
                fullWidth
                sx={{ mb: 2 }}
              />
              <Button
                component="label"
                variant="outlined"
                startIcon={<AttachFileIcon />}
                sx={{ mb: 2 }}
              >
                Attach File
                <input
                  type="file"
                  accept=".pdf,.jpeg,.jpg,.png"
                  hidden
                  onChange={e =>
                    setAttachment(e.target.files && e.target.files[0] ? e.target.files[0] : null)
                  }
                />
              </Button>
              {attachment && (
                <Typography variant="caption" sx={{ ml: 1 }}>
                  {attachment.name}
                </Typography>
              )}
              {createError && (
                <Typography color="error" variant="caption" sx={{ mt: 2, display: "block" }}>
                  {createError}
                </Typography>
              )}
              <Button
                variant="contained"
                type="submit"
                color="primary"
                disabled={createLoading}
                fullWidth
                sx={{
                  mt: 2,
                  bgcolor: BUTTON_COLOR,
                  fontWeight: 700,
                  fontSize: 17,
                  borderRadius: "8px",
                }}
              >
                {createLoading ? "Submitting..." : "Generate Ticket"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}