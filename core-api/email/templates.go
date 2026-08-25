package email

import (
	"embed"
	"fmt"
	"html/template"
	"strings"
	texttemplate "text/template"
)

// Template names. Each one is the base filename of a template pair:
// <name>.html for the HTML body and <name>.txt for the plain-text one.
//
// The name is stored on the queued row, so it is part of the data model,
// not just a lookup key — renaming one is a migration, not a rename.
const (
	// TemplatePasswordReset is the "here is your reset link" mail.
	TemplatePasswordReset = "password-reset"

	// TemplateVerifyEmail confirms a new account's address. It carries
	// the welcome copy too: a separate welcome mail sent at the same
	// moment would halve the daily send quota for no added value.
	TemplateVerifyEmail = "verify-email"

	// The two below are declared now so the names are settled in one
	// place, but their template FILES ship with the parts that use them.
	// Adding a constant here does nothing on its own — a pair only
	// becomes renderable when it is added to the templates map below,
	// and the map may only name files that exist.

	// TemplatePasswordResetGoogle tells a Google-only account that it
	// has no password to reset.
	TemplatePasswordResetGoogle = "password-reset-google"

	// TemplateEmailChange confirms a requested new address. Files ship
	// in Part D.
	TemplateEmailChange = "email-change"

	// TemplateEmailChangeAlert warns the OLD address that a change was
	// requested. Files ship in Part D.
	TemplateEmailChangeAlert = "email-change-alert"
)

//go:embed templates/*.html templates/*.txt
var templateFS embed.FS

// PasswordResetData fills the password-reset pair.
type PasswordResetData struct {
	FirstName string
	ResetURL  string
	ExpiresIn string
	AppName   string
	AppURL    string
}

// VerifyEmailData fills the verify-email pair.
type VerifyEmailData struct {
	FirstName string
	VerifyURL string
	ExpiresIn string
	AppName   string
	AppURL    string
}

// PasswordResetGoogleData fills the password-reset-google pair.
type PasswordResetGoogleData struct {
	FirstName string
	AppName   string
	AppURL    string
}

// templatePair is one message's two bodies. The HTML side is
// html/template, which escapes by context and is what keeps a user's own
// first name from becoming markup. The text side is text/template, where
// escaping would only produce &amp; in a plain-text mail.
type templatePair struct {
	html *template.Template
	text *texttemplate.Template
}

// templates maps a template name to its parsed pair.
//
// Parsing at package init is deliberate: a broken template takes the
// process down at start, where it is obvious, rather than at the moment
// someone asks for a password reset.
//
// Parts B-D append their entries here as their files land. Only pairs
// whose files exist may appear — mustPair panics on a missing file.
var templates = map[string]templatePair{
	TemplatePasswordReset:       mustPair(TemplatePasswordReset),
	TemplateVerifyEmail:         mustPair(TemplateVerifyEmail),
	TemplatePasswordResetGoogle: mustPair(TemplatePasswordResetGoogle),
}

// mustPair parses one template pair or panics.
//
// Each page gets its own html/template set, parsed from the layout plus
// that one page. They cannot share a set: every page defines a template
// called "content", and a shared set would let whichever file parsed last
// win for all of them.
func mustPair(name string) templatePair {
	return templatePair{
		html: template.Must(template.New(name).ParseFS(
			templateFS,
			"templates/layout.html",
			"templates/"+name+".html",
		)),
		text: texttemplate.Must(texttemplate.New(name).ParseFS(
			templateFS,
			"templates/"+name+".txt",
		)),
	}
}

// Render produces the HTML and plain-text bodies for one template.
//
// data must be the struct that template expects; a field the template
// asks for and the struct does not have is an error, not a blank.
//
// Callers build every URL they pass in with net/url upstream. Nothing
// here converts a string to template.URL or template.HTML: doing so would
// hand the escaping decision to the caller, which is exactly the decision
// html/template exists to make.
func Render(name string, data any) (string, string, error) {
	pair, ok := templates[name]
	if !ok {
		return "", "", fmt.Errorf("email: unknown template %q", name)
	}

	var html strings.Builder
	if err := pair.html.ExecuteTemplate(&html, "layout", data); err != nil {
		return "", "", fmt.Errorf("email: failed to render the %s HTML body: %w", name, err)
	}

	var text strings.Builder
	if err := pair.text.ExecuteTemplate(&text, name+".txt", data); err != nil {
		return "", "", fmt.Errorf("email: failed to render the %s text body: %w", name, err)
	}

	return html.String(), text.String(), nil
}
