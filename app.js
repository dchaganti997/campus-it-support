
const LOCATION_CACHE = {
  "LOC-001": "Hinman Dining Hall",
  "LOC-002": "Starbucks",
  "LOC-003": "C4 Dining Hall",
  "LOC-004": "CIW Dining Hall",
  "LOC-005": "Appalachian Dining Hall",
  "LOC-006": "B3 - Breakfast, Burgers and Bites",
  "LOC-007": "Chick-n-Bap",
  "LOC-008": "District Pickle",
  "LOC-009": "Dunkin'",
  "LOC-010": "Enzo's Pizza",
  "LOC-011": "Fire and Rice",
  "LOC-012": "Halal Shack",
  "LOC-013": "Jamal's Chicken",
  "LOC-014": "Leaf & Loaf",
  "LOC-015": "The One Sushi",
  "LOC-016": "Royal Indian",
  "LOC-017": "Shake Smart",
  "LOC-018": "Sweet Shoppe",
  "LOC-019": "The Quiet Cup",
  "LOC-020": "Bearcat Express at Downtown",
  "LOC-021": "Bearcat Express at Pharmacy",
  "LOC-022": "Panera Bread",
  "LOC-023": "Bagels & Bowls",
  "LOC-024": "ITC Cafe",
  "LOC-025": "Nourish Lab"
};


const API_URL =
  'https://script.google.com/macros/s/AKfycbz66_AP54qyUMehA9VhSI0L5yo-TDrv7-m_G2zv0FF15fKX_SINSdurUmH1mMor75rw1Q/exec';


const locationSelect =
  document.getElementById('location');

const locationMessage =
  document.getElementById('locationMessage');

const ticketForm =
  document.getElementById('ticketForm');

const submitButton =
  document.getElementById('submitButton');

const message =
  document.getElementById('message');

const attachmentInput =
  document.getElementById('attachment');

const fileInfo =
  document.getElementById('fileInfo');


/* =====================================================
   LOAD LOCATIONS
===================================================== */

async function loadLocations() {

  try {

    const response =
      await fetch(
        API_URL + '?action=getLocations'
      );

    if (!response.ok) {
      throw new Error(
        'Unable to load locations.'
      );
    }

    const data =
      await response.json();

    if (!data.success) {
      throw new Error(
        data.error ||
        'Unable to load locations.'
      );
    }


    locationSelect.innerHTML =
      '<option value="">Select location</option>';


    data.locations.forEach(
      function(location) {

        const option =
          document.createElement('option');

        option.value =
          location.id;

        option.textContent =
          location.name;

        locationSelect.appendChild(
          option
        );

      }
    );


    locationSelect.disabled =
      false;


    /* QR LOCATION */

    const params =
      new URLSearchParams(
        window.location.search
      );

    const requestedLocation =
      params.get('location');


    if (requestedLocation) {

      const exists =
        data.locations.some(
          function(location) {

            return (
              location.id ===
              requestedLocation
            );

          }
        );


      if (exists) {

        locationSelect.value =
          requestedLocation;

        const selectedOption =
          locationSelect.options[
            locationSelect.selectedIndex
          ];

        locationMessage.textContent =
          'Location selected: ' +
          selectedOption.textContent;

      } else {

        locationMessage.textContent =
          'This QR location is currently unavailable. Please select a location.';

      }

    } else {

      locationMessage.textContent =
        'Select the location where the issue is occurring.';

    }


  } catch (error) {

    console.error(
      'Location loading error:',
      error
    );

    locationSelect.innerHTML =
      '<option value="">Unable to load locations</option>';

    locationSelect.disabled =
      true;

    locationMessage.textContent =
      'Unable to load locations. Please refresh the page.';

  }

}


/* =====================================================
   LOCATION CHANGE
===================================================== */

locationSelect.addEventListener(
  'change',
  function() {

    if (locationSelect.value) {

      const selectedOption =
        locationSelect.options[
          locationSelect.selectedIndex
        ];

      locationMessage.textContent =
        'Location selected: ' +
        selectedOption.textContent;

    } else {

      locationMessage.textContent =
        'Select the location where the issue is occurring.';

    }

  }
);


/* =====================================================
   ATTACHMENT SELECTION
===================================================== */

attachmentInput.addEventListener(
  'change',
  function() {

    const file =
      attachmentInput.files[0];


    if (!file) {

      fileInfo.textContent = '';

      return;

    }


    const sizeMB =
      file.size /
      (1024 * 1024);


    fileInfo.textContent =
      file.name +
      ' (' +
      sizeMB.toFixed(2) +
      ' MB)';

  }
);


/* =====================================================
   HIDDEN IFRAME
===================================================== */

const submissionFrame =
  document.createElement('iframe');

submissionFrame.name =
  'submissionFrame';

submissionFrame.id =
  'submissionFrame';

submissionFrame.style.display =
  'none';

document.body.appendChild(
  submissionFrame
);


/* =====================================================
   APPS SCRIPT RESPONSE
===================================================== */

window.addEventListener(
  'message',
  function(event) {

    const data =
      event.data;


    if (
      !data ||
      typeof data !== 'object' ||
      typeof data.success !== 'boolean'
    ) {
      return;
    }


    submitButton.disabled =
      false;

    submitButton.textContent =
      'SUBMIT ISSUE';


    if (data.success) {

      message.className =
        'message success';

      message.style.display =
        'block';

      message.innerHTML =
        '<strong>Issue submitted successfully.</strong><br>' +
        'Ticket ID: ' +
        escapeHtml(data.ticketId);


      document.getElementById(
        'reporterName'
      ).value = '';


      document.getElementById(
        'description'
      ).value = '';


      attachmentInput.value = '';

      fileInfo.textContent = '';


    } else {

      message.className =
        'message error';

      message.style.display =
        'block';

      message.textContent =
        data.error ||
        'Unable to submit the issue.';

    }

  }
);


/* =====================================================
   SUBMIT TICKET
===================================================== */

ticketForm.addEventListener(
  'submit',
  async function(event) {

    event.preventDefault();


    const locationId =
      locationSelect.value.trim();

    const reporterName =
      document
        .getElementById('reporterName')
        .value
        .trim();

    const description =
      document
        .getElementById('description')
        .value
        .trim();


    if (
      !locationId ||
      !reporterName ||
      !description
    ) {

      showError(
        'Please complete all required fields.'
      );

      return;

    }


    /* ===============================================
       PREPARE ATTACHMENT
    =============================================== */

    const file =
      attachmentInput.files[0];


    let mediaData = '';
    let mediaName = '';
    let mediaType = '';


    try {

      if (file) {

        /*
          Keep files reasonably small for the
          Apps Script / form submission approach.
        */

        const MAX_FILE_SIZE =
          8 * 1024 * 1024;


        if (
          file.size >
          MAX_FILE_SIZE
        ) {

          showError(
            'The attachment is too large. Please use a file smaller than 8 MB.'
          );

          return;

        }


        submitButton.disabled =
          true;

        submitButton.textContent =
          'PREPARING FILE...';


        mediaData =
          await fileToDataURL(file);

        mediaName =
          file.name;

        mediaType =
          file.type || '';

      }


      /* ===============================================
         SUBMIT
      =============================================== */

      message.className =
        'message';

      message.style.display =
        'block';

      message.textContent =
        'Submitting your issue...';


      submitButton.disabled =
        true;

      submitButton.textContent =
        'SUBMITTING...';


      const form =
        document.createElement('form');


      form.method =
        'POST';

      form.action =
        API_URL;

      form.target =
        'submissionFrame';

      form.style.display =
        'none';


      addHiddenField(
        form,
        'action',
        'createTicket'
      );

      addHiddenField(
        form,
        'locationId',
        locationId
      );

      addHiddenField(
        form,
        'reporterName',
        reporterName
      );

      addHiddenField(
        form,
        'description',
        description
      );

      addHiddenField(
        form,
        'mediaData',
        mediaData
      );

      addHiddenField(
        form,
        'mediaName',
        mediaName
      );

      addHiddenField(
        form,
        'mediaType',
        mediaType
      );


      document.body.appendChild(
        form
      );


      form.submit();


      setTimeout(
        function() {

          form.remove();

        },
        2000
      );


    } catch (error) {

      console.error(
        'Submission error:',
        error
      );


      submitButton.disabled =
        false;

      submitButton.textContent =
        'SUBMIT ISSUE';


      showError(
        'Unable to prepare the attachment. Please try again.'
      );

    }

  }
);


/* =====================================================
   HELPERS
===================================================== */

function fileToDataURL(file) {

  return new Promise(
    function(resolve, reject) {

      const reader =
        new FileReader();


      reader.onload =
        function() {

          resolve(
            reader.result
          );

        };


      reader.onerror =
        function() {

          reject(
            new Error(
              'Unable to read file.'
            )
          );

        };


      reader.readAsDataURL(
        file
      );

    }
  );

}


function addHiddenField(
  form,
  name,
  value
) {

  const input =
    document.createElement('input');

  input.type =
    'hidden';

  input.name =
    name;

  input.value =
    value;

  form.appendChild(
    input
  );

}


function showError(text) {

  message.className =
    'message error';

  message.style.display =
    'block';

  message.textContent =
    text;

}


function escapeHtml(value) {

  const div =
    document.createElement('div');

  div.textContent =
    String(value || '');

  return div.innerHTML;

}


/* =====================================================
   START
===================================================== */

loadLocations();
