import * as widgets from './widgets.js';
import * as kconfig from './kconfig.js';
import * as config from './config.js';
import * as bc from './broderclocks.js';

class Keyboard{
    constructor(){
        this.keygrid_canvas = new widgets.KeyboardCanvas("key_grid", 1);
        this.clockface_canvas = new widgets.KeyboardCanvas("clock_face", 2);
        this.clockhand_canvas = new widgets.KeyboardCanvas("clock_hand", 3);
        this.output_canvas = new widgets.OutputCanvas("output", this.keygrid_canvas.screen_height / 2 + 50);

        this.left_context = "";
        this.lm_prefix = "";

        this.init_locs();
        this.rotate_index = config.default_rotate_ind;
        this.time_rotate = config.period_li[this.rotate_index];

        this.typed = "";
        this.btyped = "";
        this.ctyped = [];
        this.context = "";
        this.old_context_li = [""];
        this.last_add_li = [0];

        this.full_init=false;
        this.fetched_words = false;
        this.fetch_words();
        this.init_ui();
    }
    change_speed(index){
        var speed_index = Math.floor(index);
        // # period (as stored in config.py)
        this.rotate_index = speed_index;
        var old_rotate = this.time_rotate;
        this.time_rotate = config.period_li[this.rotate_index];
        this.bc.time_rotate = this.time_rotate;
        this.bc.clock_inf.clock_util.change_period(this.time_rotate);

        // # update the histogram
        this.histogram.update(this.bc.clock_inf.kde.dens_li);
    }
    on_press(){
        if (this.fetched_words) {
            this.bc.select();
        }
    }
    start_pause(){
        this.keygrid.in_pause = true;
        this.keygrid.draw_layout();
        setTimeout(this.end_pause.bind(this), kconfig.pause_length);
    }
    end_pause(){
        this.keygrid.in_pause = false;
        this.keygrid.draw_layout();
    }
    highlight_winner(clock_index){
        this.winner_clock = this.clockgrid.clocks[clock_index];
        this.winner_clock.winner = true;
        this.winner_clock.draw_face();
        setTimeout(this.unhighlight_winner.bind(this), kconfig.pause_length);
    }
    unhighlight_winner(){
        this.winner_clock.winner = false;
        this.winner_clock.draw_face();
    }
    continue_init(){
        this.init_words();

        this.bc_init = false;
        this.previous_undo_text = '';
        this.previous_winner = 0;

        this.gen_word_prior(false);
        //
        this.bc = new bc.BroderClocks(this);
        this.full_init=true;
        this.bc.init_follow_up(this.word_score_prior);

        this.histogram.update(this.bc.clock_inf.kde.dens_li);

    }
    init_ui(){
        this.speed_slider = document.getElementById("speed_slider");
        this.speed_slider_output = document.getElementById("speed_slider_value");
        this.speed_slider_output.innerHTML = this.speed_slider.value;

        this.speed_slider.oninput = function () {
            this.speed_slider_output.innerHTML = this.value;
        }

        this.learn_checkbox = document.getElementById("checkbox_learn");
        this.learn_checkbox.checked = true;

        this.pause_checkbox = document.getElementById("checkbox_pause");
        this.pause_checkbox.checked = true;

        this.keygrid = new widgets.KeyGrid(this.keygrid_canvas, kconfig.alpha_target_layout);
        this.clockgrid = new widgets.ClockGrid(this.clockface_canvas, this.clockhand_canvas, this.keygrid,
            kconfig.alpha_target_layout, kconfig.key_chars, kconfig.main_chars, kconfig.n_pred);
        this.textbox = new widgets.Textbox(this.output_canvas);
        this.histogram = new widgets.Histogram(this.output_canvas);
    }
    foramt_words() {
        this.word_predictions = [];
        this.word_prediction_probs = [];
        var char_index;
        var char;
        var char_words;
        var char_word_probs;
        var normalizer = 0;
        var word_index;
        for (char_index in kconfig.main_chars) {
            char = kconfig.main_chars[char_index];
            char_words = [];
            char_word_probs = [];
            for (word_index in this.words) {
                var word = this.words[word_index];
                if (word.charAt(this.lm_prefix.length) == char && char_words.length < kconfig.n_pred) {
                    char_words.push(word);
                    char_word_probs.push(1);
                    normalizer++;
                }
            }

            for (var i = char_words.length; i < kconfig.n_pred; i++) {
                char_words.push("");
                char_word_probs.push(0);

            }
            this.word_predictions.push(char_words);
            this.word_prediction_probs.push(char_word_probs);
        }
        for (char_index = kconfig.main_chars.length; char_index < kconfig.key_chars.length; char_index++){
            char_words = [];
            char_word_probs = [];
            for (var index = 0; index < kconfig.n_pred; index++) {
                char_words.push("");
                char_word_probs.push(0);
            }
            this.word_predictions.push(char_words);
            this.word_prediction_probs.push(char_word_probs);
        }

        for (var key_index=0; key_index < this.word_prediction_probs.length; key_index++){
            for (word_index = 0; word_index < kconfig.n_pred; word_index++){
                this.word_prediction_probs[key_index][word_index] =
                    Math.log(this.word_prediction_probs[key_index][word_index] / normalizer);
            }
        }

        this.clockgrid.update_word_clocks(this.word_predictions);
    }
    fetch_words(is_undo=null, is_equalize=null){
        var lm_url = "https://api.imagineville.org/word/predict?left=".concat(this.left_context, "&prefix=", this.lm_prefix,
            "&right=&num=", kconfig.num_words.toString());
        var proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        this.fetched_words = false;

        const request = async () => {
            const response = await fetch(proxyUrl+lm_url);
            const json = await response.json();
            this.words = json.words;
            this.foramt_words();
            this.fetched_words = true;
            if (!this.full_init) {
                this.continue_init();
            }
            else{
                this.draw_words();
                this.clockface_canvas.clear();
                this.gen_word_prior(false);
                var results = [this.words_on, this.words_off, this.word_score_prior, is_undo, is_equalize];
                this.bc.continue_select(results);
            }
        }
        request();
    }
    init_locs(){
        var key_chars = kconfig.key_chars;
        this.N_rows = key_chars.length;
        this.N_keys_row = [];
        this.N_keys = 0;
        this.N_alpha_keys = 0;
        var row;
        var col;
        for (row = 0; row < this.N_rows; row++){
            var n_keys = key_chars[row].length;
            for (col = 0; col < n_keys; col++){
                if (!(key_chars[row] instanceof Array)){
                    if (kconfig.main_chars.includes(key_chars[row][col]) && (key_chars[row].length == 1)){
                        this.N_alpha_keys = this.N_alpha_keys + 1;
                    }
                    else if ((key_chars[row] == kconfig.space_char) && (key_chars[row].length == 1)){
                        this.N_alpha_keys = this.N_alpha_keys + 1;
                    }
                    else if (key_chars[row] == kconfig.break_chars[1] && (
                            key_chars[row].length == 1)) {
                        this.N_alpha_keys = this.N_alpha_keys + 1;
                    }
                }
            }

            this.N_keys_row.push(n_keys);
            this.N_keys += n_keys;
        }

        // var word_clock_offset = 7 * kconfig.clock_rad;
        // var rect_offset = word_clock_offset - kconfig.clock_rad;
        // var word_offset = 8.5 * kconfig.clock_rad;
        // var rect_end = rect_offset + kconfig.word_w;

        this.clock_centers = [];
        this.win_diffs = [];
        this.word_locs = [];
        this.char_locs = [];
        this.rect_locs = [];
        this.keys_li = [];
        this.keys_ref = [];
        var index = 0;
        var word = 0;
        var key = 0;

        this.w_canvas = 0
        this.index_to_wk = [];
        for (row = 0; row < this.N_rows; row++){
            this.w_canvas = Math.max([this.w_canvas, this.N_keys_row[row] * (6 * kconfig.clock_rad + kconfig.word_w)]);
            for (col = 0; col < this.N_keys_row[row]; col ++){
                // predictive words
                this.clock_centers.push([0, 0]);
                this.clock_centers.push([0, 0]);
                this.clock_centers.push([0, 0]);
                // win diffs
                this.win_diffs.push(config.win_diff_base);
                this.win_diffs.push(config.win_diff_base);
                this.win_diffs.push(config.win_diff_base);
                // word position
                this.word_locs.push([0, 0]);
                this.word_locs.push([0, 0]);
                this.word_locs.push([0, 0]);
                // indices
                this.index_to_wk.push(word);
                this.index_to_wk.push(word + 1);
                this.index_to_wk.push(word + 2);
                index += 3;
                word += 3;

                // key character
                // reference to index of key character
                var key_char = key_chars[row][col];
                this.keys_li.push(key_chars[row][col]);
                this.keys_ref.push(index);
                this.index_to_wk.push(key);
                // key character position
                this.char_locs.push([0, 0]);
                //  clock position for key character
                this.clock_centers.push([0, 0]);
                //  win diffs
                if ((key_char == kconfig.mybad_char) || (key_char == kconfig.yourbad_char) || (
                        key_char == kconfig.back_char)){
                    this.win_diffs.push(config.win_diff_high);
                }
                else{
                    this.win_diffs.push(config.win_diff_base);
                }
                index += 1;
                key += 1;
            }
        }
    }
    init_words(){
        this.words_li = this.word_predictions;
        this.word_freq_li = this.word_prediction_probs;
        this.key_freq_li = [];
        for (var i in this.keys_li){
            this.key_freq_li.push(Math.log(1/this.keys_li.length));
        }

        this.word_id = [];
        this.word_pair = [];
        var word = 0;
        var index = 0;
        var windex = 0;
        this.words_on = [];
        this.words_off = [];
        this.word_list = [];

        // this.words_li = this.words.sort();

        var len_con = this.context.length;
        var key;
        var pred;
        var word_str;
        for (key = 0; key < this.N_alpha_keys; key++){
            for (pred = 0; pred < kconfig.n_pred; pred++){
                word_str = this.words_li[key][pred];
                var len_word = word_str.length;

                this.word_pair.push([key, pred]);
                if (word_str == '') {
                    this.words_off.push(index);
                }
                else{
                    this.words_on.push(index);
                }
                windex += 1;
                word += 1;
                index += 1;
            }
            this.words_on.push(index);
            this.word_pair.push([key,]);
            index += 1;
        }
        for (key = this.N_alpha_keys; key < this.N_keys; key++){
            for (pred =0; pred < kconfig.n_pred; pred++) {
                word_str = this.words_li[key][pred];
                this.word_pair.push([key, pred]);
                this.words_off.push(index);
                index += 1;
            }
            this.words_on.push(index);
            this.word_pair.push([key,]);
            index += 1;
        }
        this.typed_versions = [''];
    }
    draw_words() {
        this.words_li = this.word_predictions;
        this.word_freq_li = this.word_prediction_probs;
        this.key_freq_li = [];
        for (var i in this.keys_li) {
            this.key_freq_li.push(Math.log(1 / this.keys_li.length));
        }

        this.word_id = [];
        this.word_pair = [];
        var word = 0;
        var index = 0;
        var windex = 0;
        this.words_on = [];
        this.words_off = [];
        this.word_list = [];

        var len_con = this.context.length;
        var key;
        var pred;
        var word_str;
        for (key = 0; key < this.N_alpha_keys; key++){
            for (pred = 0; pred < kconfig.n_pred; pred++){
                word_str = this.words_li[key][pred];
                var len_word = word_str.length;

                this.word_pair.push([key, pred]);
                if (word_str == '') {
                    this.words_off.push(index);
                }
                else{
                    this.words_on.push(index);
                }
                windex += 1;
                word += 1;
                index += 1;
            }
            this.words_on.push(index);
            this.word_pair.push([key,]);
            index += 1;
        }
        for (key = this.N_alpha_keys; key < this.N_keys; key++){
            for (pred =0; pred < kconfig.n_pred; pred++) {
                word_str = this.words_li[key][pred];
                this.word_pair.push([key, pred]);
                this.words_off.push(index);
                index += 1;
            }
            this.words_on.push(index);
            this.word_pair.push([key,]);
            index += 1;
        }
    }
    gen_word_prior(undo){
        this.word_score_prior = [];
        var N_on = this.words_on.length;

        var index;
        var i;
        var key;
        var pred;
        var prob;
        var pair;

        if (!undo) {
            for (i in this.words_on) {
                index = this.words_on[i];
                pair = this.word_pair[index];
                //  word case
                if (pair.length == 2) {
                    key = pair[0];
                    pred = pair[1];
                    prob = this.word_freq_li[key][pred] + Math.log(kconfig.rem_prob);
                    this.word_score_prior.push(prob);
                } else {
                    key = pair[0];
                    prob = this.key_freq_li[key];
                    prob = prob + Math.log(kconfig.rem_prob);
                    if (this.keys_li[key] == kconfig.mybad_char) {
                        prob = Math.log(kconfig.undo_prob);
                    }
                    if (this.keys_li[key] == kconfig.back_char) {
                        prob = Math.log(kconfig.back_prob);
                    }
                    if (this.keys_li[key] == kconfig.clear_char) {
                        prob = Math.log(kconfig.undo_prob);
                    }

                    this.word_score_prior.push(prob);
                }
            }
        } else {
            for (i in this.words_on) {
                index = this.words_on[i];
                pair = this.word_pair[index];
                if (pair.length == 1) {
                    key = pair[0]
                    if (this.keys_li[key] == kconfig.mybad_char || this.keys_li[key] == kconfig.yourbad_char) {
                        prob = kconfig.undo_prob;
                        this.word_score_prior.push(Math.log(prob));
                    } else {
                        this.word_score_prior.push(-Infinity);
                    }
                } else {
                    this.word_score_prior.append(-Infinity);
                }
            }
        }
    }
    draw_typed(){
        var new_text = '';
        var redraw_words = false;

        var is_delete = false;
        var is_undo = false;

        var previous_text = this.textbox.text;

        if (previous_text.length > 0 && previous_text.charAt(previous_text.length - 1) == "_") {
            previous_text = previous_text.slice(0, previous_text.length - 1).concat(" ");
        }

        var last_add;
        var undo_text;
        if (this.last_add_li.length > 1) {
            last_add = this.last_add_li[this.last_add_li.length - 1];
            if (last_add > 0) {
                new_text = this.typed.slice(this.typed.length -last_add, this.typed.length);
                undo_text = new_text;
            } else if (last_add == -1) {
                new_text = '';
                is_delete = true;
                undo_text = kconfig.back_char;
            }
        } else {
            new_text = '';
            undo_text = new_text;
        }

        previous_text = previous_text.replace(" .", ". ");
        previous_text = previous_text.replace(" ,", ", ");
        previous_text = previous_text.replace(" ?", "? ");
        previous_text = previous_text.replace(" !", "! ");

        var index = this.previous_winner;
        if ( [kconfig.mybad_char, 'Undo'].includes(this.clockgrid.clocks[index].text)){
            is_undo = true;
            is_delete = false;
        }
        if (this.typed_versions[this.typed_versions.length - 1] == '' && this.typed_versions.length > 1) {
            undo_text = 'Clear';
        }

        var input_text;
        if (this.clear_text) {
            this.typed_versions.push('');
            input_text = "";
            this.lm_prefix = "";
            this.textbox.draw_text('');
            this.clear_text = false;
            undo_text = 'Clear';
        }
        else if (is_delete){
            if (this.typed_versions[this.typed_versions.length -1 ] != ''){
                this.typed_versions.push(previous_text.slice(0, previous_text.length-1));
                new_text = this.typed_versions[this.typed_versions.length - 1];
                if (new_text.length > 0 && new_text.charAt(new_text.length - 1) == " "){
                    new_text = new_text.slice(0, new_text.lenght-1).concat("_");
                }

                input_text = new_text;
                this.textbox.draw_text(new_text);
            }
            else {
                input_text = "";
            }
        }
        else if (is_undo){
            if (this.typed_versions.length > 1){
                this.typed_versions.pop();

                new_text = this.typed_versions[this.typed_versions.length -1];
                if (new_text.length > 0 && new_text.charAt(new_text.length - 1) == " "){
                    new_text = new_text.slice(0, new_text.length - 1);
                }
                input_text = new_text;
                this.textbox.draw_text(new_text);
            }
            else {
                input_text = "";
            }
        }
        else{
            this.typed_versions.push(previous_text.concat(new_text));
            if (new_text.length > 0 && new_text.charAt(new_text.length - 1) == " "){
                    new_text = new_text.slice(0, new_text.length - 1);
            }
            input_text = previous_text.concat(new_text);

            input_text = input_text.replace(" .", "._");
            input_text = input_text.replace(" ,", ",_");
            input_text = input_text.replace(" ?", "?_");
            input_text = input_text.replace(" !", "!_");

            this.textbox.draw_text(input_text);
        }
        if (undo_text == kconfig.mybad_char){
            undo_text = "Undo";
        }
        else if (undo_text == kconfig.back_char) {
            undo_text = "Backspace";
        }
        else if (undo_text == kconfig.clear_char) {
            undo_text = "Clear";
        }

        this.previous_undo_text = undo_text;
        // self.mainWidget.undo_label.setText("<font color='green'>" + undo_text + "</font>")
    }
    make_choice(index){
        var is_undo = false;
        var is_equalize = false;
        var is_backspace = false;

        // // # now pause (if desired)
        // if self.pause_set == 1:
        //     self.on_pause()
        //     self.mainWidget.pause_timer.start(kconfig.pause_length)

        // # highlight winner
        this.previous_winner = index;
        // this.highlight_winner(index);

        var i;
        // # if selected a key
        if ((index - kconfig.n_pred) % (kconfig.n_pred + 1) == 0){
            var new_char = this.clockgrid.clocks[index].text;
            new_char = new_char.replace("Undo", kconfig.mybad_char);
            new_char = new_char.replace("Backspace", kconfig.back_char);
            new_char = new_char.replace("Clear", kconfig.clear_char);

            // # special characters
            if (new_char == kconfig.space_char || new_char == ' '){
                new_char = '_'
                this.old_context_li.push(this.context);
                this.typed = this.typed.concat(new_char);
                this.context = "";
                this.last_add_li.push(1);
            }
            else if (new_char == kconfig.mybad_char || new_char == kconfig.yourbad_char){
                // # if added characters that turn
                if (this.last_add_li.length > 1){
                    var last_add = this.last_add_li.pop();
                    this.context = this.old_context_li.pop();
                    if (last_add > 0){
                        this.typed = this.typed.slice(0, this.typed.length - last_add);
                    }
                    else if (last_add == -1){
                        var letter = this.btyped.charAt(this.btyped.length - 1);

                        this.btyped = this.btyped.slice(0, this.btyped.length-1);
                        this.typed = this.typed.concat(letter);
                    }
                    else if (last_add == -2){
                        var prev_typed = this.ctyped.pop();
                        this.typed = prev_typed;
                    }
                }
                if (new_char == kconfig.yourbad_char) {
                    is_equalize = true;
                }
                new_char = '';
                is_undo = true;
            }
            else if (new_char == kconfig.back_char){
                is_backspace = true;
                // # if delete the last character that turn
                this.old_context_li.push(this.context);

                var lt = this.typed.length;
                if (lt > 0){
                    this.btyped = this.btyped.concat(this.typed.charAt(this.typed.length-1));
                    this.last_add_li.push(-1);
                    this.typed = this.typed.slice(0, this.typed.length-1);
                    lt -= 1;
                    if (lt == 0) {
                        this.context = "";
                    }
                    else if (this.context.length > 0)
                        this.context = this.context.slice(0, this.context.length - 1);
                    // else if (!this.typed[-1].match(/[a-z]/i)) {
                    //     this.context = "";
                    // }
                    // else{
                    //     i = -1;
                    //     while ((i >= -lt) && (this.typed[i].match(/[a-z]/i))){
                    //         i -= 1;
                    //         this.context = this.typed.splice(i + 1, lt);
                    //     }
                    // }
                }
                new_char = '';
            }
            else if (new_char == kconfig.clear_char) {
                new_char = '_';
                this.old_context_li.push(this.context);
                this.context = "";
                this.ctyped.push(this.typed);
                this.typed = ""
                this.last_add_li.push(-2);

                this.clear_text = true;
            }
            else if (kconfig.main_chars.includes(new_char)) {
                this.old_context_li.push(this.context);
                this.context.concat(new_char);
                this.last_add_li.push(1);
                this.typed = this.typed.concat(new_char);
            }
            else if (kconfig.break_chars.includes(new_char)) {
                this.old_context_li.push(this.context);
                this.context = "";
                this.last_add_li.push(1)
                this.typed = this.typed.concat(new_char);
                // if " " + new_char in self.typed:
                //     self.last_add_li.concat(2);
                //     self.typed = self.typed.replace(" " + new_char, new_char + " ");
            }
            else{
                this.typed = this.typed.concat(new_char);
            }
        }
        else{
            var key = this.index_to_wk[index];
            var pred = this.index_to_wk[index] % kconfig.n_pred;
            var new_word = this.clockgrid.clocks[index].text.concat("_");
            var new_selection = new_word;
            var context_length = this.lm_prefix.length;

            // if (context_length > 0){
            //     this.typed = this.typed.slice(context_length, this.typed.length);
            // }
            this.typed = this.left_context.concat(new_word);
            // this.typed = this.typed.concat(new_word);
            this.last_add_li.push(new_word.length - this.lm_prefix.length);
            this.old_context_li.push(this.context);
            this.context = "";
        }
        // # update the screen
        if (this.context != ""){
            this.left_context = this.typed.split(0,this.typed.length-this.context.length);
        }
        else{
            this.left_context = this.typed;
        }

        // this.draw_words();
        this.update_context();

        this.draw_typed();

        if (this.pause_checkbox.checked) {
            this.start_pause();
        }
        this.highlight_winner(index);

        this.fetch_words(is_undo, is_equalize);
        // # update the word prior
        console.log(this.typed);

        // return [this.words_on, this.words_off, this.word_score_prior, is_undo, is_equalize];
    }
    update_context(){
        var space_index = Math.max(this.typed.lastIndexOf(" "), this.typed.lastIndexOf("_"));
        var break_index = -1;
        for (var break_char_index in kconfig.break_chars){
            var break_char = kconfig.break_chars[break_char_index];
            break_index = Math.max(this.typed.lastIndexOf(break_char), break_index);
        }
        var context_index = Math.max(break_index, space_index);
        this.left_context = this.typed.slice(0, context_index+1);
        this.lm_prefix = this.typed.slice(context_index+1, this.typed.length);
        this.left_context = this.left_context.replace("_", " ");
    }
}

function animate(){
    if (keyboard.full_init) {
        keyboard.bc.clock_inf.clock_util.increment(keyboard.words_on);
    }
}

var audio = new Audio('audio/bell.wav');
var audio_checkbox = document.getElementById("checkbox_sound");
audio_checkbox.checked = true;

let keyboard = new Keyboard();

var speed_slider = document.getElementById("speed_slider");
var speed_slider_output = document.getElementById("speed_slider_value");
speed_slider_output.innerHTML = speed_slider.value;

speed_slider.oninput = function() {
    speed_slider_output.innerHTML = this.value;
    keyboard.change_speed(this.value);
}

document.onkeypress = function() {myFunction()};

function myFunction() {
    keyboard.on_press();
    if (audio_checkbox.checked){
        audio.play();
    }
}

function displayWindowSize(){
    keyboard.keygrid_canvas.calculate_size();
    keyboard.keygrid.generate_layout();
    keyboard.keygrid.draw_layout();

    keyboard.clockface_canvas.calculate_size();
    keyboard.clockhand_canvas.calculate_size();
    keyboard.clockgrid.clocks = [];
    keyboard.clockgrid.generate_layout();
    keyboard.clockgrid.update_word_clocks(keyboard.words_li);
    for (var clock_ind in keyboard.clockgrid.clocks){
        var clock = keyboard.clockgrid.clocks[clock_ind];
        if (clock != null){
            clock.draw_face();
        }
    }

    keyboard.output_canvas.calculate_size(keyboard.keygrid_canvas.screen_height / 2 + 50);
    keyboard.histogram.calculate_size();
    keyboard.histogram.draw_box();
    keyboard.histogram.draw_histogram();
    keyboard.textbox.calculate_size();
    keyboard.textbox.draw_box();
    keyboard.textbox.draw_text();
}


// Attaching the event listener function to window's resize event
window.addEventListener("resize", displayWindowSize);

    // Calling the function for the first time
// displayWindowSize();

setInterval(animate, config.ideal_wait_s*1000);