require("./Main.scss");

// HTML Basics
import "core-js/es/promise";
import "@fortawesome/fontawesome-free/js/all";
import "prismjs";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/plugins/line-numbers/prism-line-numbers";
import "prismjs/plugins/autolinker/prism-autolinker";
import "prismjs/plugins/command-line/prism-command-line";
import "prismjs/plugins/normalize-whitespace/prism-normalize-whitespace";
import "buefy";

// Codes
import { default as Axios } from "axios";
import { default as _ } from "lodash";
import { default as $ } from "jquery";
import { default as Moment } from "moment";
import "moment/locale/ja";
Moment.locale("ja");

import {default as Guacamole } from "guacamole-common-js";


