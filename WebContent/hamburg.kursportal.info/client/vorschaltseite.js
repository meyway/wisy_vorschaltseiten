  var vorschaltseite_an = 1;
  var fernes_portal_abfragen = 1;
  var fernes_portal_vorladen = 1;

  var wechseln_txt1 = "Sie werden jetzt nach >>";
  var wechseln_txt2 = "<< weitergeleitet! Da dies zuletzt Ihr bevorzugtes Portal war.";

  var prefcookie_gueltigkeit = 365; // Tage

  var dist_portal_url = "http://hamburg-aktiv.info/";
  var callback_url = "http://hamburg-aktiv.info/files/hh/hamburgaktiv/vorschaltseite/xs_callback_json.php";  

  var preload_done = false;

  var bgimage = '#super_wrapper #left .header H1, #super_wrapper #right .header H1, #super_wrapper #left > DIV, #super_wrapper #right > DIV, #super_wrapper #link-left, #super_wrapper #link-right, #super_wrapper #link-left:focus, #super_wrapper #logo_links, #super_wrapper #logo_rechts';

   /* Entscheidungsfenster anfangs ausgeblendet.
      1. Nun, nach Laden der Seite: Links setzen, Entscheidungsfenster einblenden, wenn lokales Portal noch nicht Favorit, sonst entfernen, Cookie erneuern.
      2. Während Entscheidungsfenster angezeigt, im Hintergrund anderes Portal nach Cookie Fragen. Non-Blocking mit Timeout.
      3. Sobald Maus ueber Beschreibung des anderen Portals geht: im Hintergrund iframe mit anderem Portal vorladen, aber nicht einblenden. Non-Blocking.
    */
   jQuery(document).ready(
      function() {

        // 1.
        if(init_vorschaltseite()) {
        jQuery(bgimage).css('background-image', "url('/files/hh/vorschaltseite/csg-541f1d05e8acd.png')");
        
          // 2.
          fernes_portal_jetzt_abfragen();
      
          // 3.
          if(fernes_portal_vorladen) { 
            jQuery(".dist-portal").mouseenter(function() { setTimeout(function() { preload(dist_portal_url+'#skip_preload'); }, 1); });
          }
    
        } else {
          // Entweder soll Vorschaltseite allg. nicht angezeigt werden,
          // oder ich bin bereits auf meinem Favoritenportal,
          // oder komme von einer Unterseite.
          log_error("Initialisierung des Vorschaltfensters konnte nicht durchgefuehrt werden oder ausgeschaltet.");
        }
        
    }); // Ende: document(ready)


  // @returns: {Boolean}
  function init_vorschaltseite() {
    
    if(!vorschaltseite_an) {
      return false;
    }
    
    if(window.location.hash == "#skip_preload") {
      return false; // gilt auch fuer Fernabfrage
    }
    
    propagate_dist_url(dist_portal_url+"#favorit");

    if(window.location.hash == "#favorit" || jQuery.cookie("pref_portal") == document.domain) {
    
      jQuery('#super_wrapper').remove();
      pref_set_cookie();
      
      // Wenn ich bereits auf dem korrekten Portal bin,
      // brauche ich das ferne Portal nicht mehr fragen (im Idealfall) und es auch nicht vorladen.

      return false; 
    // 
    } else if( is_homepage() && (document.referrer == "" || !document.referrer.match(document.domain)) ) {
      
      // Vorschaltseite nur auf der 1. Startseite anzeigen, aber nicht wenn man bereits von einer Unterseite des selben Portals kommt.
      vorschaltseite_display();
      return true;
    }

    return false;
  }
  
  
  // @returns: {Boolean}
  function fernes_portal_jetzt_abfragen() {
    
    if(!fernes_portal_abfragen) {
      return false;
    }
       
    var xhr = createCORSRequest('GET', callback_url);

    if (!xhr) {
      
      // Fallback JSON-P:
      setTimeout(function(){ xss_ajax(callback_url+"?format=JSONP"); }, 1);
      return true;
    
    } else { 
      
      // CORS
      xhr.onload = function() {
        
        var responseText = xhr.responseText;
        
        if(xhr.status != 200) {
          return false;
        }
        
        var response = jQuery.parseJSON(responseText);
          
        if (typeof response !== 'object') {
          log_error("Kein Response-Object: "+responseText);
          return false;
        }
        
        if(response.pref_portal != "" && response.pref_portal != "undefined") {
          callback(response);
        } else {
              ; // noch kein Portal-Favorit gesetzt.
        }
           
          
      } // Ende: onload
      
    }; // Ende: CORS vorbereiten
        
    xhr.onerror = function() {
      log_error("Fehler!");
    };
  
    var _xhr = xhr;
    setTimeout(function() { _xhr.send(); }, 1);
          
    return true;
  
  } // Ende: fernes Portal abfragen.
  

  /* CORS = 1. Wahl -> wenn unterstuetzt.
  * Rufe anderes Portal mit dortigem Cookie auf, um hier als Script-Element in DOM injiziert zu werden
  * und die Callbackfunktion damit aufzurufen.
  * @returns {Object|NULL} xhr
  */
  function createCORSRequest(method, url) {
    
    var xhr = new XMLHttpRequest();
    
    if ("withCredentials" in xhr) {
    
      // "withCredentials" -> XMLHTTPRequest2 -> Cookie-Uebertragung -> Praefportal-Ermittlung
      xhr.open(method, url, true);
      xhr.withCredentials = true;
      xhr.setRequestHeader("Accept", "plain/text");
    
    } else if (typeof XDomainRequest != "undefined") {
        // eingentlich hier sinnlos, weil ohne Credentials keine Cookie -> keine Praefportal-Ermittlung.
              
        // IF XDomainRequest.
        // XDomainRequest only exists in IE, and is IE's way of making CORS requests.
        // xhr = new XDomainRequest();
        // xhr.setRequestHeader("Content-Type", "plain/text");
        // xhr.open(method, url);
    
    } else {
    
    // CORS nicht unterstuetzt
        xhr = null;
    
      }
      return xhr;
    
  } // Ende: createCORSRequest
    

  /* JSON-P als Fallback -> wenn CORS nicht unterstuetzt  */
  function xss_ajax(url) {
    var script_id = null;
        
    var script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', url);
    script.setAttribute('id', 'distportalscript');
    script_id = document.getElementById('distportalscript');
        
    if(script_id){
      document.getElementsByTagName('head')[0].removeChild(script_id);
    }

    document.getElementsByTagName('head')[0].appendChild(script);
  }
 
 
  /* Von fernem Portal/mit fernem Cookie aufgerufene Funktion
   * 1.  Wenn das praeferierte Portal ohnehin das hiesige ist: Entscheidungsfenster ausblenden
   * 2.  Wenn auch beim anderen Portal noch keine Praeferenz getroffen, nichts = mit Entscheidungsfenster weiter machen
   * 3.  Das andere Portal wurde schon ein mal vorgezogen => Frage stellen, ob wechseln, sonst hier bleiben / Fenster schliessen 
   * 3a. Falls Umentscheidung fuer hiesiges Portal erfolgt => Cookie auf anderem Portal loeschen.
   */
  function callback(data) {

    if(data.pref_portal == document.domain) { // 1.

      vorschaltseite_remove();

    } else if(data.pref_portal == "undefined" || data.pref_portal == null) { // 2.

      ; // JSON-P hat nichts gebracht, weil Cookie nicht ausgelesen werden konnte (z.B. IE < 9) 

    } else { // 3.
      vorschaltseite_display();
      
      var changePortal = confirm(wechseln_txt1+data.pref_portal.toUpperCase()+wechseln_txt2);
      if (changePortal == true) {
        window.location.href = dist_portal_url+"#favorit";
      } else { // 3a.
        vorschaltseite_remove();
           
        setTimeout(function() { xss_ajax(callback_url+'?reset=pref_portal'); }, 1);
      }
    }
    
  } // Ende: callback(data)
  
  
    
  // OPTISCHES    
  function vorschaltseite_display() {
    jQuery('#super_wrapper').show();
    jQuery('html,body').css("overflow", "hidden");
    jQuery('#wisy_contentarea').hide();
  }

  function vorschaltseite_remove() {
    jQuery('#super_wrapper').remove();
    jQuery('body').css({"margin-left":"8px", "height":"100%", "min-height":"100%"});
    jQuery('#wisy_contentarea').show();
    pref_set_cookie();
  }

  // COOKIE
  function pref_set_cookie() {
    jQuery.cookie("pref_portal", document.domain, { expires: prefcookie_gueltigkeit });
  }

  // LINKS
  // Injiziert Link zu anderem Portal in alle entspr. Links des Entscheidungsfensters
  function propagate_dist_url(url) {
    jQuery(".dist-portal a").each(
    function() {
      jQuery(this).attr("href", dist_portal_url+"#favorit");
    });
  }

  // PRELOAD
  // Laedt Startseite fernen Portals in lokalen iframe, um Ladezeit beim Wechsel zu reduzieren.
  // Iframe => alle Ressourcen. 
  function preload(url) {
    if(window.location.hash != "#skip_preload" && !preload_done) {
      var dist_portal_preload = jQuery("#dist_portal_preload");
      if (dist_portal_preload.length > 0) { dist_portal_preload.remove(); }
      
      jQuery('<iframe />', {src: dist_portal_url+'#skip_preload', id: 'dist_portal_preload'}).appendTo('#wrapper').hide();
      
      preload_done = true;
    }
  }
    
  function is_homepage() {
    return (jQuery("body.wisyp_homepage").length > 0);
  }
  
  function log_error(text) {
    if(typeof console === 'undefined') { ; } else { console.log(text); }
  }