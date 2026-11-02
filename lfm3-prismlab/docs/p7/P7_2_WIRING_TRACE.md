# P7.2 — Source wiring inspection

## LiquidAI/LFM3-1.7B
Revision: `ac2586a34f1a1c03329dbdcdefabd8b6478ddaa7`

### modeling_lfm3.py
SHA256: `e8cd5254ea99ce6bd731b57b10908c2e8b5010ce8315341f895a38484885eeab`

**Lfm3MLP**
- Inherits: `['nn.Module']`
- Methods: `['__init__', 'forward']`
- Initialized attributes: `['w1', 'w2', 'w3']`
- `forward` self-calls: `['self.w1', 'self.w2', 'self.w3']`

**Lfm3Attention**
- Inherits: `['nn.Module']`
- Methods: `['__init__', 'forward']`
- Initialized attributes: `['config', 'gate_proj', 'head_dim', 'is_causal', 'k_norm', 'k_proj', 'layer_idx', 'num_key_value_groups', 'o_proj', 'q_norm', 'q_proj', 'scaling', 'sliding_window', 'v_proj']`
- `forward` self-calls: `['self.gate_proj', 'self.k_norm', 'self.k_norm(self.k_proj(hidden_states).view(*hidden_shape)).transpose', 'self.k_proj', 'self.k_proj(hidden_states).view', 'self.o_proj', 'self.q_norm', 'self.q_norm(self.q_proj(hidden_states).view(*hidden_shape)).transpose', 'self.q_proj', 'self.q_proj(hidden_states).view', 'self.v_proj', 'self.v_proj(hidden_states).view', 'self.v_proj(hidden_states).view(*hidden_shape).transpose']`

**Lfm3ShortConv**
- Inherits: `['nn.Module']`
- Methods: `['__init__', 'forward', '_conv', '_segmented_conv']`
- Initialized attributes: `['bias', 'config', 'conv', 'conv_kernel_size', 'in_proj', 'layer_idx', 'layer_type', 'out_proj']`
- `forward` self-calls: `['self._conv', 'self._segmented_conv', 'self.conv.weight.squeeze', 'self.in_proj', 'self.in_proj(hidden_states).transpose', 'self.out_proj']`

**Lfm3DecoderLayer**
- Inherits: `['GradientCheckpointingLayer']`
- Methods: `['__init__', 'forward']`
- Initialized attributes: `['conv', 'feed_forward', 'ffn_norm', 'is_attention_layer', 'operator_norm', 'post_ffn_norm', 'post_operator_norm', 'self_attn', 'use_sandwich_norm']`
- `forward` self-calls: `['self.conv', 'self.feed_forward', 'self.ffn_norm', 'self.operator_norm', 'self.post_ffn_norm', 'self.post_operator_norm', 'self.self_attn']`

## LiquidAI/LFM3-VL-2B
Revision: `ba44bd51db20a2753f28c273a1571ccaa210d954`

### modeling_lfm3_vl.py
SHA256: `a41cbe7242f379808bcc005207ee0d7b1709528966c1e4da46baa7c41827ac79`

**Lfm3VlVisionLayer**
- Inherits: `['GradientCheckpointingLayer']`
- Methods: `['__init__', 'forward']`
- Initialized attributes: `['conv', 'feed_forward', 'ffn_norm', 'is_attention_layer', 'operator_norm', 'self_attn']`
- `forward` self-calls: `['self.conv', 'self.feed_forward', 'self.ffn_norm', 'self.operator_norm', 'self.self_attn']`

**Lfm3VlVisionModel**
- Inherits: `['Lfm3VlPreTrainedModel']`
- Methods: `['__init__', 'forward']`
- Initialized attributes: `['embedding_norm', 'gradient_checkpointing', 'layers', 'patchifier', 'rotary_pos_emb', 'spatial_merge_size']`
- `forward` self-calls: `['self.embedding_norm', 'self.patchifier', 'self.rotary_pos_emb']`

**Lfm3VlMultiModalProjector**
- Inherits: `['nn.Module']`
- Methods: `['__init__', 'forward']`
- Initialized attributes: `['act', 'downsample_factor', 'layer_norm', 'linear_1', 'linear_2']`
- `forward` self-calls: `['self.act', 'self.layer_norm', 'self.layer_norm(image_features).reshape', 'self.linear_1', 'self.linear_2']`

**Lfm3VlModel**
- Inherits: `['Lfm3VlPreTrainedModel']`
- Methods: `['__init__', 'get_image_features', 'get_placeholder_mask', 'forward', 'get_video_features']`
- Initialized attributes: `['language_model', 'multi_modal_projector', 'vision_tower']`
- `forward` self-calls: `['self.get_image_features', 'self.get_input_embeddings', 'self.get_input_embeddings()', 'self.get_placeholder_mask', 'self.get_video_features', 'self.language_model']`

## LiquidAI/LFM3-Audio-2B
Revision: `0295e4130594c06800fd25451d97139ac2da1aff`

### modeling_lfm3_audio.py
SHA256: `8d7225d892b8b09edbe2285a8add883ce46e28c4027edc2b8c59b501eeadb9e0`

**Lfm3AudioEncoder**
- Inherits: `['nn.Module']`
- Methods: `['__init__', 'forward', 'stream']`
- Initialized attributes: `['config', 'downsample', 'lfm']`
- `forward` self-calls: `['self.downsample', 'self.downsample(input_features, feature_lengths).transpose', 'self.downsample.output_lengths', 'self.lfm']`

**Lfm3AudioDepthDecoder**
- Inherits: `['nn.Module']`
- Methods: `['__init__', 'embed_codes', 'forward', 'trunk']`
- Initialized attributes: `['config', 'depth_embeddings', 'depth_linear', 'hidden_size', 'mask_embedding', 'model', 'num_codebooks']`
- `forward` self-calls: `['self.depth_linear', 'self.depth_linear(hidden_states).unflatten', 'self.embed_codes', 'self.mask_embedding.to', 'self.trunk']`

**Lfm3AudioModel**
- Inherits: `['Lfm3AudioPreTrainedModel']`
- Methods: `['__init__', 'get_input_embeddings', 'set_input_embeddings', 'get_audio_features', 'get_audio_features_stream', 'get_audio_out_embeds', 'get_placeholder_positions', 'check_speech_placeholders', 'get_placeholder_mask', 'forward']`
- Initialized attributes: `['audio_encoder', 'audio_projector', 'codebook_embedding', 'depth_decoder', 'language_model']`
- `forward` self-calls: `['self.check_speech_placeholders', 'self.get_audio_features', 'self.get_audio_features(input_features, feature_attention_mask).to', 'self.get_audio_out_embeds', 'self.get_audio_out_embeds(audio_out_codes).to', 'self.get_input_embeddings', 'self.get_input_embeddings()', 'self.get_placeholder_mask', 'self.language_model']`

### modeling_liquid_codec.py
SHA256: `5ca87e1b6e0549b40dc90fad5ee9d55620e9defb78c67e19c5937208c8e14f74`

**LiquidCodecModel**
- Inherits: `['PreTrainedAudioTokenizerBase']`
- Methods: `['__init__', '_init_weights', 'encode', 'decode', 'forward']`
- Initialized attributes: `['decoder', 'encoder', 'from_quantizer', 'frontend', 'quantizer', 'stft', 'to_quantizer']`
- `forward` self-calls: `['self.decode', 'self.encode']`

## LiquidAI/LFM3-Omni-2B
Revision: `5797d07c125503bd4f4c0e7f915ae2d3d703e8de`

### modeling_lfm3_omni.py
SHA256: `9872e64112f9e255fba43212771226772af521e93f99c1984ecba1049664c465`

**Lfm3OmniDepthDecoder**
- Inherits: `['nn.Module']`
- Methods: `['__init__', 'embed_codes', 'forward', 'trunk']`
- Initialized attributes: `['config', 'depth_embeddings', 'depth_linear', 'hidden_size', 'mask_embedding', 'model', 'num_codebooks']`
- `forward` self-calls: `['self.depth_linear', 'self.depth_linear(hidden_states).unflatten', 'self.embed_codes', 'self.mask_embedding.to', 'self.trunk']`

**Lfm3OmniMultiModalProjector**
- Inherits: `['nn.Module']`
- Methods: `['__init__', 'forward']`
- Initialized attributes: `['act', 'downsample_factor', 'layer_norm', 'linear_1', 'linear_2']`
- `forward` self-calls: `['self.act', 'self.layer_norm', 'self.layer_norm(image_features).reshape', 'self.linear_1', 'self.linear_2']`

**Lfm3OmniEncoder**
- Inherits: `['nn.Module']`
- Methods: `['__init__', 'forward', 'stream']`
- Initialized attributes: `['config', 'downsample', 'lfm']`
- `forward` self-calls: `['self.downsample', 'self.downsample(input_features, feature_lengths).transpose', 'self.downsample.output_lengths', 'self.lfm']`

**Lfm3OmniModel**
- Inherits: `['Lfm3OmniPreTrainedModel']`
- Methods: `['__init__', 'get_input_embeddings', 'set_input_embeddings', 'get_audio_features', 'get_audio_features_stream', 'get_audio_out_embeds', 'get_placeholder_positions', 'check_speech_placeholders', 'get_placeholder_mask', 'forward', 'get_image_features', 'get_video_features']`
- Initialized attributes: `['audio_encoder', 'audio_projector', 'codebook_embedding', 'depth_decoder', 'language_model', 'multi_modal_projector', 'vision_tower']`
- `forward` self-calls: `['self.check_speech_placeholders', 'self.get_audio_features', 'self.get_audio_features(input_features, feature_attention_mask).to', 'self.get_audio_out_embeds', 'self.get_audio_out_embeds(audio_out_codes).to', 'self.get_image_features', 'self.get_image_features(pixel_values, image_grid_thw).to', 'self.get_input_embeddings', 'self.get_input_embeddings()', 'self.get_placeholder_mask', 'self.get_video_features', 'self.get_video_features(pixel_values_videos, video_grid_thw).to', 'self.language_model']`

## LiquidAI/d1-2B
Revision: `10e7671d44e4b37700020b1eed3f594c5f2af0b4`

### api.py
SHA256: `d57845b414b6766cd0410f0437080244320adebd4f9f031a03777acbec243d2a`

**SystemOneApi**
- Inherits: `[]`
- Methods: `['ask', 'named', 'answer', 'run', 'probabilities', 'system_one', 'system_one_batch']`
- `system_one` self-calls: `['self.system_one_batch']`
- `system_one_batch` self-calls: `['self.answer', 'self.named', 'self.run']`
- `run` self-calls: `[]`

### calibration.py
SHA256: `04243c3a2c1c727440184901dd60a4b4b04f72204dc577bd9f30b0ea3373d114`

**Calibration**
- Inherits: `[]`
- Methods: `['temperature', 'apply', 'through', 'level', 'load']`

### lfm3.py
SHA256: `608348f7e2f963744c8b3940bcf93d29e4499643a1269a048b48bec0d6c47129`

**Lfm3SystemOne**
- Inherits: `['SystemOneModel']`
- Methods: `['__init__', 'fuse_projections']`
- Initialized attributes: `[]`

**Fused**
- Inherits: `['torch.nn.Module']`
- Methods: `['__init__']`
- Initialized attributes: `['weight']`

**Part**
- Inherits: `['torch.nn.Module']`
- Methods: `['__init__', 'forward']`
- Initialized attributes: `[]`
- `forward` self-calls: `[]`

### modeling_d1.py
SHA256: `214d3477cef38e7831f2b4fb0250ace7fb1aeac5b02066fcfd5cc030c541fd72`

**SystemOneModel**
- Inherits: `[]`
- Methods: `['from_pretrained', 'd1_file', '_revision', 'engine', 'compile', 'system_one', 'system_one_batch']`
- `system_one` self-calls: `['self.engine.system_one']`
- `system_one_batch` self-calls: `['self.engine.system_one_batch']`

### modeling_d1_lfm3_vl.py
SHA256: `68d71f38188f07d11ad8af7cb557c8edc87536eb0db20870b7c5e6ae58fe5f30`

**D1Model**
- Inherits: `['Lfm3SystemOne', 'Lfm3VlForConditionalGeneration']`
- Methods: `[]`

### prompt.py
SHA256: `e9d40f98c36ab68b8e3c33fd00a77e58218460fdc88c96b5edeef793a260d20b`

**Choice**
- Inherits: `[]`
- Methods: `[]`

**Noul**
- Inherits: `[]`
- Methods: `[]`

**Score**
- Inherits: `[]`
- Methods: `[]`

**Read**
- Inherits: `[]`
- Methods: `[]`

**Estimate**
- Inherits: `[]`
- Methods: `['grid']`

**Box**
- Inherits: `[]`
- Methods: `[]`

**Boxes**
- Inherits: `[]`
- Methods: `['blocks']`

**Position**
- Inherits: `[]`
- Methods: `[]`

**Number**
- Inherits: `[]`
- Methods: `[]`

### runner.py
SHA256: `ac195b19f60f985a6081ccecc1a5c9f7c9fbe6711e8916c0e9835aaaac0bc2a2`

**SlotReader**
- Inherits: `[]`
- Methods: `['_serve', '_readout', '_readouts', 'media', '_prefix', '_suffixes', '_sequences', '_padded']`

**SystemOne**
- Inherits: `['SlotReader', 'SystemOneApi']`
- Methods: `['__init__', 'compile', 'render', 'run', '_batches', '_rows', '_slot_logits', '_readouts', 'tokens', '_load_processor', '_on_device']`
- Initialized attributes: `['bos', 'device', 'lead', 'token_budget']`
- `run` self-calls: `['self._padded']`

### slots.py
SHA256: `67adea5fb377a79832827c43054b4ce94de0fa48f5ba0a39e6f2867b7e59f373`

**SlotLogits**
- Inherits: `[]`
- Methods: `[]`

## LiquidAI/d1-Omni-2B
Revision: `431f1d667de5afcc9b0c58b2d9c170a7b38b358b`

### api.py
SHA256: `d57845b414b6766cd0410f0437080244320adebd4f9f031a03777acbec243d2a`

**SystemOneApi**
- Inherits: `[]`
- Methods: `['ask', 'named', 'answer', 'run', 'probabilities', 'system_one', 'system_one_batch']`
- `system_one` self-calls: `['self.system_one_batch']`
- `system_one_batch` self-calls: `['self.answer', 'self.named', 'self.run']`
- `run` self-calls: `[]`

### calibration.py
SHA256: `04243c3a2c1c727440184901dd60a4b4b04f72204dc577bd9f30b0ea3373d114`

**Calibration**
- Inherits: `[]`
- Methods: `['temperature', 'apply', 'through', 'level', 'load']`

### lfm3.py
SHA256: `8cd91970a0af52dc6d65ca489a0a0a034eda5751002cf2c25abd143cff8725d7`

**Lfm3SystemOne**
- Inherits: `['SystemOneModel']`
- Methods: `['__init__', 'fuse_projections']`
- Initialized attributes: `[]`

**Fused**
- Inherits: `['torch.nn.Module']`
- Methods: `['__init__']`
- Initialized attributes: `['weight']`

**Part**
- Inherits: `['torch.nn.Module']`
- Methods: `['__init__', 'forward']`
- Initialized attributes: `[]`
- `forward` self-calls: `[]`

### modeling_d1.py
SHA256: `214d3477cef38e7831f2b4fb0250ace7fb1aeac5b02066fcfd5cc030c541fd72`

**SystemOneModel**
- Inherits: `[]`
- Methods: `['from_pretrained', 'd1_file', '_revision', 'engine', 'compile', 'system_one', 'system_one_batch']`
- `system_one` self-calls: `['self.engine.system_one']`
- `system_one_batch` self-calls: `['self.engine.system_one_batch']`

### modeling_d1_lfm3_omni.py
SHA256: `be09e4292373fec960d322474a1012f9e7cd62b395d6cce16622a85a894cae6b`

**D1Model**
- Inherits: `['Lfm3SystemOne', 'Lfm3OmniForConditionalGeneration']`
- Methods: `[]`

### prompt.py
SHA256: `e9d40f98c36ab68b8e3c33fd00a77e58218460fdc88c96b5edeef793a260d20b`

**Choice**
- Inherits: `[]`
- Methods: `[]`

**Noul**
- Inherits: `[]`
- Methods: `[]`

**Score**
- Inherits: `[]`
- Methods: `[]`

**Read**
- Inherits: `[]`
- Methods: `[]`

**Estimate**
- Inherits: `[]`
- Methods: `['grid']`

**Box**
- Inherits: `[]`
- Methods: `[]`

**Boxes**
- Inherits: `[]`
- Methods: `['blocks']`

**Position**
- Inherits: `[]`
- Methods: `[]`

**Number**
- Inherits: `[]`
- Methods: `[]`

### runner.py
SHA256: `ac195b19f60f985a6081ccecc1a5c9f7c9fbe6711e8916c0e9835aaaac0bc2a2`

**SlotReader**
- Inherits: `[]`
- Methods: `['_serve', '_readout', '_readouts', 'media', '_prefix', '_suffixes', '_sequences', '_padded']`

**SystemOne**
- Inherits: `['SlotReader', 'SystemOneApi']`
- Methods: `['__init__', 'compile', 'render', 'run', '_batches', '_rows', '_slot_logits', '_readouts', 'tokens', '_load_processor', '_on_device']`
- Initialized attributes: `['bos', 'device', 'lead', 'token_budget']`
- `run` self-calls: `['self._padded']`

### slots.py
SHA256: `67adea5fb377a79832827c43054b4ce94de0fa48f5ba0a39e6f2867b7e59f373`

**SlotLogits**
- Inherits: `[]`
- Methods: `[]`

