<?php
/**
 * Plugin Name: CAP Forms
 * Description: Processa com segurança os formulários de contato e de solicitações LGPD do site CAP.
 * Version: 1.0.0
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * License: GPL-2.0-or-later
 */

defined( 'ABSPATH' ) || exit;

const CAP_FORMS_NONCE_ACTION = 'cap_forms_submit';
const CAP_FORMS_RATE_LIMIT = 5;

add_action( 'wp_ajax_cap_forms_get_config', 'cap_forms_get_config' );
add_action( 'wp_ajax_nopriv_cap_forms_get_config', 'cap_forms_get_config' );
add_action( 'wp_ajax_cap_submit_contact', 'cap_forms_handle_contact' );
add_action( 'wp_ajax_nopriv_cap_submit_contact', 'cap_forms_handle_contact' );
add_action( 'wp_ajax_cap_submit_dpo', 'cap_forms_handle_dpo' );
add_action( 'wp_ajax_nopriv_cap_submit_dpo', 'cap_forms_handle_dpo' );

/**
 * Entrega o nonce somente para o JavaScript do mesmo site.
 */
function cap_forms_get_config() {
	nocache_headers();

	wp_send_json_success(
		array(
			'nonce' => wp_create_nonce( CAP_FORMS_NONCE_ACTION ),
		)
	);
}

/**
 * Retorna um campo POST simples sem permitir arrays inesperados.
 *
 * @param string $key Nome do campo.
 * @return string
 */
function cap_forms_post_value( $key ) {
	if ( ! isset( $_POST[ $key ] ) || ! is_string( $_POST[ $key ] ) ) {
		return '';
	}

	return trim( wp_unslash( $_POST[ $key ] ) );
}

/**
 * Faz uma verificação adicional de origem quando o navegador envia o header Origin.
 *
 * @return bool
 */
function cap_forms_has_valid_origin() {
	$origin = get_http_origin();
	if ( empty( $origin ) ) {
		return true;
	}

	$origin_parts = wp_parse_url( $origin );
	$site_parts   = wp_parse_url( home_url( '/' ) );

	if ( empty( $origin_parts['host'] ) || empty( $site_parts['host'] ) || empty( $origin_parts['scheme'] ) || empty( $site_parts['scheme'] ) ) {
		return false;
	}

	$origin_port = isset( $origin_parts['port'] ) ? (int) $origin_parts['port'] : ( 'https' === $origin_parts['scheme'] ? 443 : 80 );
	$site_port   = isset( $site_parts['port'] ) ? (int) $site_parts['port'] : ( 'https' === $site_parts['scheme'] ? 443 : 80 );

	return strtolower( $origin_parts['scheme'] ) === strtolower( $site_parts['scheme'] )
		&& strtolower( $origin_parts['host'] ) === strtolower( $site_parts['host'] )
		&& $origin_port === $site_port;
}

/**
 * Verifica o nonce enviado pelo formulário sem responder com HTML.
 */
function cap_forms_require_valid_nonce() {
	$nonce = sanitize_text_field( cap_forms_post_value( 'security' ) );
	if ( empty( $nonce ) || ! wp_verify_nonce( $nonce, CAP_FORMS_NONCE_ACTION ) ) {
		wp_send_json_error( array( 'message' => 'Sua sessão expirou. Atualize a página e tente novamente.' ), 403 );
	}
}

/**
 * Identifica o IP de conexão sem confiar em headers encaminhados pelo cliente.
 *
 * @return string
 */
function cap_forms_client_ip() {
	$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';

	return filter_var( $ip, FILTER_VALIDATE_IP ) ? $ip : '0.0.0.0';
}

/**
 * Limita cada IP a cinco solicitações válidas por formulário em uma hora.
 *
 * @param string $form_type Tipo do formulário.
 * @return bool True quando o limite já foi atingido.
 */
function cap_forms_is_rate_limited( $form_type ) {
	$key        = 'cap_forms_rate_' . hash( 'sha256', $form_type . '|' . cap_forms_client_ip() . '|' . wp_salt( 'nonce' ) );
	$now        = time();
	$timestamps = get_transient( $key );
	$recent     = array();

	if ( is_array( $timestamps ) ) {
		foreach ( $timestamps as $timestamp ) {
			if ( is_int( $timestamp ) && $timestamp > ( $now - HOUR_IN_SECONDS ) ) {
				$recent[] = $timestamp;
			}
		}
	}

	if ( count( $recent ) >= CAP_FORMS_RATE_LIMIT ) {
		return true;
	}

	$recent[] = $now;
	set_transient( $key, $recent, HOUR_IN_SECONDS );

	return false;
}

/**
 * Confere se o navegador permaneceu tempo suficiente na página para reduzir bots simples.
 */
function cap_forms_require_human_delay() {
	$started_at = absint( cap_forms_post_value( 'form_started_at' ) );
	$now        = (int) round( microtime( true ) * 1000 );

	if ( empty( $started_at ) || $started_at > $now || ( $now - $started_at ) < 2500 ) {
		wp_send_json_error( array( 'message' => 'Aguarde alguns segundos e tente enviar novamente.' ), 400 );
	}
}

/**
 * Retorna sucesso sem processar envios preenchidos por robôs no campo invisível.
 *
 * @param string $message Mensagem de sucesso do formulário.
 */
function cap_forms_handle_honeypot( $message ) {
	if ( '' !== cap_forms_post_value( 'website' ) ) {
		wp_send_json_success( array( 'message' => $message ) );
	}
}

/**
 * Valida e normaliza um CPF brasileiro.
 *
 * @param string $cpf CPF contendo ou não pontuação.
 * @return bool
 */
function cap_forms_is_valid_cpf( $cpf ) {
	$cpf = preg_replace( '/\D+/', '', $cpf );

	if ( 11 !== strlen( $cpf ) || preg_match( '/^(\d)\1{10}$/', $cpf ) ) {
		return false;
	}

	for ( $position = 9; $position < 11; $position++ ) {
		$sum = 0;
		for ( $index = 0, $factor = $position + 1; $index < $position; $index++, $factor-- ) {
			$sum += (int) $cpf[ $index ] * $factor;
		}

		$digit = ( $sum * 10 ) % 11;
		$digit = 10 === $digit ? 0 : $digit;

		if ( $digit !== (int) $cpf[ $position ] ) {
			return false;
		}
	}

	return true;
}

/**
 * Formata somente telefones brasileiros de dez ou onze dígitos já validados.
 *
 * @param string $phone Telefone apenas com dígitos.
 * @return string
 */
function cap_forms_format_phone( $phone ) {
	if ( 10 === strlen( $phone ) ) {
		return sprintf( '(%s) %s-%s', substr( $phone, 0, 2 ), substr( $phone, 2, 4 ), substr( $phone, 6 ) );
	}

	return sprintf( '(%s) %s-%s', substr( $phone, 0, 2 ), substr( $phone, 2, 5 ), substr( $phone, 7 ) );
}

/**
 * Valida os campos compartilhados pelos dois formulários.
 *
 * @return array<string, string>
 */
function cap_forms_get_common_fields() {
	$name    = sanitize_text_field( cap_forms_post_value( 'nome' ) );
	$email   = sanitize_email( cap_forms_post_value( 'email' ) );
	$phone   = preg_replace( '/\D+/', '', cap_forms_post_value( 'telefone' ) );
	$message = sanitize_textarea_field( cap_forms_post_value( 'mensagem' ) );

	if ( strlen( $name ) < 2 || strlen( $name ) > 100 ) {
		wp_send_json_error( array( 'message' => 'Informe seu nome completo.' ), 400 );
	}

	if ( ! is_email( $email ) ) {
		wp_send_json_error( array( 'message' => 'Informe um e-mail válido.' ), 400 );
	}

	if ( ! preg_match( '/^\d{10,11}$/', $phone ) ) {
		wp_send_json_error( array( 'message' => 'Informe um telefone válido com DDD.' ), 400 );
	}

	if ( strlen( $message ) < 10 || strlen( $message ) > 4000 ) {
		wp_send_json_error( array( 'message' => 'A mensagem deve ter entre 10 e 4.000 caracteres.' ), 400 );
	}

	return array(
		'nome'     => $name,
		'email'    => $email,
		'telefone' => cap_forms_format_phone( $phone ),
		'mensagem' => $message,
	);
}

/**
 * Retorna o e-mail de destino. Por padrão usa o e-mail administrativo do WordPress.
 * O destino pode ser alterado com o filtro cap_forms_recipient.
 *
 * @param string $form_type Tipo do formulário.
 * @return string
 */
function cap_forms_recipient( $form_type ) {
	$recipient = apply_filters( 'cap_forms_recipient', get_option( 'admin_email' ), $form_type );

	return is_string( $recipient ) && is_email( $recipient ) ? $recipient : '';
}

/**
 * Envia um e-mail em texto simples e não armazena as solicitações no banco de dados.
 *
 * @param string               $form_type Tipo do formulário.
 * @param array<string, string> $fields Campos já validados.
 * @return bool
 */
function cap_forms_send_email( $form_type, $fields ) {
	$recipient = cap_forms_recipient( $form_type );
	if ( empty( $recipient ) ) {
		wp_send_json_error( array( 'message' => 'O recebimento de formulários ainda não foi configurado.' ), 500 );
	}

	$site_name = wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES );
	$subject   = 'dpo' === $form_type
		? sprintf( '[%s] Nova solicitação de direitos LGPD', $site_name )
		: sprintf( '[%s] Novo contato pelo site', $site_name );

	$lines = array(
		'dpo' === $form_type ? 'Nova solicitação relacionada a dados pessoais.' : 'Nova mensagem de contato recebida pelo site.',
		'',
		'Nome: ' . $fields['nome'],
		'E-mail: ' . $fields['email'],
		'Telefone: ' . $fields['telefone'],
	);

	if ( 'dpo' === $form_type ) {
		$lines[] = 'CPF: ' . $fields['cpf'];
		$lines[] = 'Motivação: ' . $fields['motivacao'];
	}

	$lines[] = '';
	$lines[] = 'Mensagem:';
	$lines[] = $fields['mensagem'];

	$headers = array(
		'Content-Type: text/plain; charset=UTF-8',
		sprintf( 'Reply-To: %s <%s>', $fields['nome'], $fields['email'] ),
	);

	return wp_mail( $recipient, $subject, implode( PHP_EOL, $lines ), $headers );
}

/**
 * Executa as proteções compartilhadas antes de processar qualquer formulário.
 *
 * @param string $form_type Tipo do formulário.
 * @param string $success_message Resposta usada para o honeypot.
 */
function cap_forms_prepare_submission( $form_type, $success_message ) {
	if ( ! cap_forms_has_valid_origin() ) {
		wp_send_json_error( array( 'message' => 'Não foi possível validar a origem da solicitação.' ), 403 );
	}

	cap_forms_require_valid_nonce();
	cap_forms_handle_honeypot( $success_message );
	cap_forms_require_human_delay();

	if ( cap_forms_is_rate_limited( $form_type ) ) {
		wp_send_json_error( array( 'message' => 'Você atingiu o limite de envios. Tente novamente mais tarde.' ), 429 );
	}
}

/**
 * Processa o formulário comercial.
 */
function cap_forms_handle_contact() {
	$success_message = 'Mensagem enviada com sucesso. Obrigado pelo contato!';
	cap_forms_prepare_submission( 'contact', $success_message );

	$fields = cap_forms_get_common_fields();
	if ( strlen( $fields['mensagem'] ) > 3000 ) {
		wp_send_json_error( array( 'message' => 'A mensagem deve ter no máximo 3.000 caracteres.' ), 400 );
	}

	if ( ! cap_forms_send_email( 'contact', $fields ) ) {
		wp_send_json_error( array( 'message' => 'Não foi possível enviar sua mensagem. Tente novamente mais tarde.' ), 500 );
	}

	wp_send_json_success( array( 'message' => $success_message ) );
}

/**
 * Processa o formulário de solicitação de direitos LGPD.
 */
function cap_forms_handle_dpo() {
	$success_message = 'Solicitação enviada com sucesso. Entraremos em contato pelo e-mail informado.';
	cap_forms_prepare_submission( 'dpo', $success_message );

	$fields     = cap_forms_get_common_fields();
	$cpf        = preg_replace( '/\D+/', '', cap_forms_post_value( 'cpf' ) );
	$motivation = sanitize_text_field( cap_forms_post_value( 'motivacao' ) );
	$motivations = array(
		'Acesso e correção aos dados',
		'Anonimização ou bloqueio dos dados desnecessários',
		'Confirmação da existência de tratamento',
		'Eliminação dos dados',
		'Informação das entidades com que o controlador compartilhou dados',
		'Informação sobre não fornecer consentimento',
		'Oposição ao tratamento, se for irregular',
		'Portabilidade dos dados a outro fornecedor',
		'Revogação do consentimento',
	);

	if ( ! cap_forms_is_valid_cpf( $cpf ) ) {
		wp_send_json_error( array( 'message' => 'Informe um CPF válido.' ), 400 );
	}

	if ( ! in_array( $motivation, $motivations, true ) ) {
		wp_send_json_error( array( 'message' => 'Selecione uma motivação válida.' ), 400 );
	}

	$fields['cpf']       = $cpf;
	$fields['motivacao'] = $motivation;

	if ( ! cap_forms_send_email( 'dpo', $fields ) ) {
		wp_send_json_error( array( 'message' => 'Não foi possível enviar sua solicitação. Tente novamente mais tarde.' ), 500 );
	}

	wp_send_json_success( array( 'message' => $success_message ) );
}
