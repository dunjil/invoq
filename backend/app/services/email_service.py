import resend
from app.config import settings
from typing import Optional, Dict

# Initialize Resend
resend.api_key = settings.resend_api_key

class EmailService:
    @staticmethod
    def _get_base_template(sender_name: str, content: str, track_url: Optional[str] = None) -> str:
        """Centralized V8 styling logic."""
        footer_link = f'<p><a href="{track_url}" style="color: #D4A017; text-decoration: none;">View on Invoq</a></p>' if track_url else ""
        return f"""
        <div style="font-family: sans-serif; background-color: #FAF9F6; color: #1A1A18; padding: 40px; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <header style="margin-bottom: 30px; border-bottom: 1px solid #FAF9F6; padding-bottom: 20px;">
                    <h1 style="color: #D4A017; margin: 0; font-size: 24px;">{sender_name}</h1>
                    <p style="margin: 5px 0 0 0; color: #6B6B63; font-size: 14px;">via Invoq</p>
                </header>
                
                <main style="font-size: 16px;">
                    {content}
                </main>
                
                <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #FAF9F6; color: #6B6B63; font-size: 12px;">
                    <p><strong>Invoq</strong> — The relationship-first platform for contractors.</p>
                    {footer_link}
                </footer>
            </div>
        </div>
        """

    @staticmethod
    async def send_invocation_email(
        sender_name: str,
        recipient_email: str,
        document_type: str,
        token: str
    ):
        """Sends a professional invocation email to a new recipient."""
        document_label = document_type.upper()
        track_url = f"{settings.frontend_url}/track/{token}"
        
        content = f"""
            <p>Hello,</p>
            <p><strong>{sender_name}</strong> has sent you a <strong>{document_label}</strong> via Invoq.</p>
            
            <div style="margin: 35px 0;">
                <a href="{track_url}" 
                   style="background-color: #D4A017; color: white; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                   View your {document_type}
                </a>
            </div>
            
            <p style="font-size: 14px; color: #6B6B63;">
                Invoq is a professional document and invoicing platform. 
                Your account is free and takes under a minute to create.
            </p>
        """
        
        html_content = EmailService._get_base_template(sender_name, content, track_url)
        
        try:
            resend.Emails.send({
                "from": "Invoq <notifications@invoq.app>",
                "to": recipient_email,
                "subject": f"{sender_name} has sent you a {document_type} via Invoq",
                "html": html_content
            })
            return True
        except Exception as e:
            print(f"Failed to send email: {e}")
            return False

    @staticmethod
    async def send_rejection_notification(
        sender_name: str,
        recipient_email: str,
        document_type: str,
        document_number: str,
        reason: str,
        category: Optional[str] = None,
        notes: Optional[str] = None,
        context_block: Optional[Dict] = None
    ):
        """Notifies the sender that their document was rejected with structured feedback."""
        
        context_html = ""
        if context_block:
            field = context_block.get("field", "Value")
            current = context_block.get("current", "N/A")
            requested = context_block.get("requested", "N/A")
            context_html = f"""
            <div style="margin-top: 15px; padding: 10px; background-color: #fff; border: 1px solid #eee; font-family: monospace;">
                <p style="margin: 0; font-size: 12px; color: #6B6B63;">{field.upper()}</p>
                <p style="margin: 5px 0; color: #C0392B;">Current: {current}</p>
                <p style="margin: 0; color: #4A7C59;">Requested: {requested}</p>
            </div>
            """

        content = f"""
            <h2 style="color: #C0392B; margin-top: 0;">{document_type.capitalize()} Rejected</h2>
            <p>Your <strong>{document_type} #{document_number}</strong> was rejected by <strong>{sender_name}</strong>.</p>
            
            <div style="background-color: #FAF9F6; padding: 20px; border-left: 4px solid #C0392B; margin: 25px 0;">
                <p style="margin: 0; font-weight: bold; color: #1A1A18;">{category or 'Reason'}: {reason}</p>
                {f'<p style="margin: 10px 0 0 0; color: #6B6B63; font-style: italic;">"{notes}"</p>' if notes else ''}
                {context_html}
            </div>
            
            <p>Click the button below to edit and reissue the document immediately.</p>
            
            <div style="margin: 25px 0;">
                <a href="{settings.frontend_url}/dashboard" 
                   style="background-color: #1A1A18; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                   Fix this {document_type}
                </a>
            </div>
        """
        
        html_content = EmailService._get_base_template("Invoq Notifications", content)
        
        try:
            resend.Emails.send({
                "from": "Invoq <notifications@invoq.app>",
                "to": recipient_email,
                "subject": f"Rejection: {document_type} #{document_number}",
                "html": html_content
            })
            return True
        except Exception as e:
            print(f"Failed to send rejection email: {e}")
            return False

    @staticmethod
    async def send_reminder_email(
        sender_name: str,
        recipient_email: str,
        document_type: str,
        document_number: str,
        amount: float,
        currency_symbol: str,
        due_date: str,
        reminder_type: str # heads-up, due-today, overdue
    ):
        """Sends a professional reminder email based on timing."""
        
        accent_color = "#D4A017" if reminder_type != "overdue" else "#C0392B"
        
        if reminder_type == "heads-up":
            subject = f"Friendly Reminder: {document_type} #{document_number} due soon"
            title = "Payment Reminder"
            body = f"Just a friendly heads-up that your {document_type} <strong>#{document_number}</strong> for <strong>{currency_symbol}{amount}</strong> is due on <strong>{due_date}</strong>."
        elif reminder_type == "due-today":
            subject = f"Due Today: {document_type} #{document_number}"
            title = "Payment Due Today"
            body = f"This is a reminder that your {document_type} <strong>#{document_number}</strong> for <strong>{currency_symbol}{amount}</strong> is due today."
        elif reminder_type == "overdue":
            subject = f"OVERDUE: {document_type} #{document_number}"
            title = "Payment Overdue"
            body = f"Your {document_type} <strong>#{document_number}</strong> for <strong>{currency_symbol}{amount}</strong> is now overdue. Please arrange payment as soon as possible."
        else:
            return False

        content = f"""
            <h2 style="color: {accent_color}; margin-top: 0;">{title}</h2>
            <p>{body}</p>
            
            <div style="margin: 30px 0; padding: 20px; border: 1px solid #FAF9F6; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #6B6B63;">AMOUNT DUE</p>
                <p style="margin: 5px 0; font-size: 24px; font-weight: bold; font-family: monospace;">{currency_symbol}{amount}</p>
            </div>
            
            <div style="margin: 25px 0;">
                <a href="{settings.frontend_url}/dashboard" 
                   style="background-color: #D4A017; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                   View and Pay
                </a>
            </div>
            
            <p style="font-size: 12px; color: #6B6B63; font-style: italic;">
                If you've already made this payment, please disregard this message.
            </p>
        """
        
        html_content = EmailService._get_base_template(sender_name, content)
        
        try:
            resend.Emails.send({
                "from": "Invoq <notifications@invoq.app>",
                "to": recipient_email,
                "subject": subject,
                "html": html_content
            })
            return True
        except Exception as e:
            print(f"Failed to send reminder email: {e}")
            return False

