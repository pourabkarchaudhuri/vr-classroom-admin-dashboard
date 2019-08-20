var graph = require('@microsoft/microsoft-graph-client');
var request = require("request");

module.exports = {
  getUserDetails: async function (accessToken) {
    const client = getAuthenticatedClient(accessToken);

    const user = await client.api('/me').get();
    return user;
  },

  getEvents: async function (accessToken) {
    const client = getAuthenticatedClient(accessToken);

    const events = await client
      .api('/me/events')
      .select('subject,organizer,start,end')
      .orderby('createdDateTime DESC')
      .get();
    console.log(events)
    return events;
  },
  sendCalendarInvites: async (accessToken, name, utcStart, utcEnd, emails, key) => {

    var options = {
      method: 'POST',
      url: 'https://graph.microsoft.com/v1.0/me/events',
      headers: {
        Host: 'graph.microsoft.com',
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: {
        subject: name,
        body:
        {
          contentType: 'HTML',
          content: 'Hi All,</br></br>This is an invitation to join a VR session in the room : '+name+'</br></br><b>Meeting Number (Access Code) : '+key+'</b></br></br></br>Thanks & Regards'
        },
        start:
        {
          dateTime: utcStart,
          timeZone: 'UTC'
        },
        end:
        {
          dateTime: utcEnd,
          timeZone: 'UTC'
        },
        location: { displayName: 'Room Meeting' },
        attendees: emails
      },
      json: true
    };

    request(options, function (error, response, body) {
      if (error) throw new Error(error);

      console.log(body);
    });

  }
};

function getAuthenticatedClient(accessToken) {
  // Initialize Graph client
  const client = graph.Client.init({
    // Use the provided access token to authenticate
    // requests
    authProvider: (done) => {
      done(null, accessToken);
    }
  });

  return client;
}