<?php
    /* Diese Datei antwortet auf eine CORS oder JSON-P - Anfrage durch *.hamburg-kursportal.info
     * Sie hilft die Portalpraeferenz unter den beiden Portalen zu ermitteln: durch auslesen des lokalen Cookies.
     * Zurückgegeben wird ein Fehler - oder sonst der Aufruf der Callbackfunktion in JS, z.B. callback("hamburg.kursportal.info");
     * @param string|null reset, string|null format
     * @return string|JS response
     */

    $allowed = false;
    
    if(in_array(strtolower($_SERVER['HTTP_ORIGIN']),
                array(  'http://sandbox.hamburg.kursportal.info',
                        'http://hamburg.kursportal.info',
                        'http://m.hamburg.kursportal.info'))) {
        $allowed = true;
    }

    if($allowed || $format == "JSONP" || $_GET["reset"] != "") {
        
        // http://caniuse.com/#search=cors
        if($allowed) {
            header('Access-Control-Allow-Origin: '.$_SERVER['HTTP_ORIGIN']);
        }
        
        header('Access-Control-Allow-Credentials: true');
        
        // IE Einschraenkungen: http://msdn.microsoft.com/en-us/library/ie/hh673569%28v=vs.85%29.aspx
        // http://techblog.constantcontact.com/software-development/using-cors-for-cross-domain-ajax-requests/
        header('Access-Control-Allow-Headers: X-Requested-With');
            
        // http://msdn.microsoft.com/en-us/library/ms537343%28v=vs.85%29.aspx
        header('P3P: CP="'.$_SERVER['SERVER_NAME'].' does not have a P3P policy."');
           
        if($format == "JSONP") {
            header('Content-Type: application/javascript');
        } else {
            // IE > 8 && IE < 11
            header('Content-Type: application/javascript');
        }
        
    
        if(strtolower($_GET["reset"]) == "pref_portal") {
            
            // Lokales Cookie loeschen, da anderes Portal Favorit wurde.
            unset($_COOKIE["pref_portal"]);
            setcookie("pref_portal", null, time()-3600, "/");
            
            echo "if(typeof console === 'undefined') { ; } else { console.log('Cookie fuer ".$_SERVER['SERVER_NAME']." geloescht!') }";
            
        } else {

            // Lokales Cookie als Funktion aus-/zurueckgeben.            
            $response = "Format fehlt!";
            
            $obj = array();
            $obj["pref_portal"] = $_COOKIE["pref_portal"];
           
            // JSON-P
            if($format == "JSONP") {
                $response = "callback(".json_encode($obj).");";
            }
            
            // CORS
            if(strtolower($_SERVER['HTTP_ACCEPT']) == "plain/text") {
                $response = json_encode($obj);
            }
            
            echo $response;
        }
        
    } else {
        echo "if(typeof console === 'undefined') { ; } else { console.log('Fehler! Zugang zu den Ressourcen von ".$_SERVER['SERVER_NAME']." nicht erlaubt.') }";
    }
?>