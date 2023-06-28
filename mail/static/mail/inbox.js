document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);
  document.querySelector('#compose-form').addEventListener('submit', send_email);

  // By default, load the inbox
  load_mailbox('inbox');
});

function compose_email() {

  // Show compose view and hide other views
  document.querySelector('#compose-view').style.display = 'block';
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'none';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';
}

function load_mailbox(mailbox) {

  // Clear previously loaded rows
  document.querySelector('#emails-row').innerHTML = '';

  // When a mailbox is visited, query the API for the latest emails in that mailbox.
  fetch_emails(mailbox);

  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'none';

  // Show the mailbox title
  document.querySelector('#emails-title').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;
}

function send_email(event) {
  // adding this line of code thanks to a suggestion from the user 'kroiz' in stackoverflow:
  // https://stackoverflow.com/questions/59176488/networkerror-when-attempting-to-fetch-resource-only-on-firefox
  // for some reason, the console kept giving me the error:
  // "Uncaught (in promise) TypeError: NetworkError when attempting to fetch resource."
  // but this line of code fixes it.
  event.preventDefault();

  const recipients = document.querySelector('#compose-recipients').value;
  const subject = document.querySelector('#compose-subject').value;
  const body = document.querySelector('#compose-body').value;

  // Passing data via POST to 'emails' endpoint and parsing the response
  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
        recipients: recipients,
        subject: subject,
        body: body
    })
  })
  .then(response => response.json())
  .then(result => {
      console.log(result);
      load_mailbox('sent');
  });
}

function fetch_emails(mailbox) {
  if (mailbox === "inbox" || mailbox === "sent" || mailbox === "archive") {
    fetch(`/emails/${mailbox}`)
    .then(response => response.json())
    .then(emails => {

      // Go through each email and...
      emails.forEach(email => {

        // ...create a row for each
        const newRow = document.createElement('div');
        newRow.className = "row";
        newRow.innerHTML = `
          <div class="col"><b>${email.sender}</b></div>
          <div class="col-6">${email.subject}</div>
          <div class="col">${email.timestamp}</div>
        `;
        document.querySelector('#emails-row').append(newRow);

        // ...change the background color if it has been read
        if (email.read) {
          newRow.style.backgroundColor = "#D3D3D3"; // HTML LightGray
        }

        // ...add an action listener to takes me to the specific email clicked
        newRow.addEventListener('click', () => {view_email(email.id);});
      });
    });
  }
}

function view_email(email_id) {
  fetch(`/emails/${email_id}`)
  .then(response => response.json())
  .then(email => {

    // Show the email and hide other views
    document.querySelector('#email-view').style.display = 'block';
    document.querySelector('#emails-view').style.display = 'none';
    document.querySelector('#compose-view').style.display = 'none';

    // create the header and the body of the email
    const emailHeader = document.querySelector('#email-header');
    const emailBody = document.querySelector('#email-body');
    emailHeader.innerHTML = `
      <div><b>From:</b> ${email.sender}</div>
      <div><b>To:</b> ${email.recipients}</div>
      <div><b>Subject:</b> ${email.subject}</div>
      <div><b>Timestamp:</b> ${email.timestamp}</div>
    `;
    emailBody.innerHTML = `
      <div>${email.body}</div>
    `;

    // if the email is in 'Sent' then we do not create the reply and archive buttons
    if (document.querySelector('#emails-title').innerHTML.includes('Sent')) {
      return;
    }

    // add a reply button to the email
    const replyButton = document.createElement('button');
    replyButton.className = "btn btn-sm btn-outline-primary";
    replyButton.innerHTML = "Reply";
    emailHeader.append(replyButton);
    replyButton.onclick = () => {
      compose_email();

      // set recipients, subject and body on default values
      const recipients = document.querySelector('#compose-recipients');
      const subject = document.querySelector('#compose-subject');
      const body = document.querySelector('#compose-body');
      recipients.value = email.sender;
      subject.value = `re: ${email.subject}`;
      body.value = `"On ${email.timestamp} ${email.sender} wrote: ${email.body}"\n`;
    };

    // add an archive button to the email
    const archiveButton = document.createElement('button');
    archiveButton.className = "btn btn-sm btn-outline-primary";
    archiveButton.innerHTML = email.archived ? "Unarchive" : "Archive";
    emailHeader.append(archiveButton);
    archiveButton.onclick = () => {
      fetch(`/emails/${email_id}`, {
        method: 'PUT',
        body: JSON.stringify({
            archived: !email.archived
        })
      })
      .then(() => { load_mailbox('inbox') })
    };
  })
  .then(() => {

    // after clicking on it we set the email as read
    fetch(`/emails/${email_id}`, {
      method: 'PUT',
      body: JSON.stringify({
          read: true
      })
    })
  });
}
