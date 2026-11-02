# P7.1 — Six-model config inventory

Generated from official Hugging Face `config.json` files. This inventory is not a complete architecture proof.

| Alias | Model | Status | Config SHA256 | Observed field count |
|---|---|---|---|---:|
| `text` | `LiquidAI/LFM3-1.7B` | OK | `8c6ae8b8f6d88c87cfb98cf4b5e34e943d0ee07e24215c4121b3159a46e1399d` | 14 |
| `vision` | `LiquidAI/LFM3-VL-2B` | OK | `18a02e8b5963e38c98683e2c948705ea45220d75f017e9b4bdd9cf54692e6dc3` | 29 |
| `audio` | `LiquidAI/LFM3-Audio-2B` | OK | `1eb2a8349a1ec9eda2ed8e8bb1a8788007ae2ae9baa38a7d959743c5379d30d8` | 43 |
| `omni` | `LiquidAI/LFM3-Omni-2B` | OK | `17e3792551ef56b37e85bbd1e6e968f70dc5b4b14c96f1339d0be85e0ba46875` | 58 |
| `d1` | `LiquidAI/d1-2B` | OK | `ffdc4c996152d23dbe8a2659a8c6aabe2992aa3fa3a41601dd0fca8771d6f332` | 30 |
| `d1_omni` | `LiquidAI/d1-Omni-2B` | OK | `cebf53b6bb8835cefe9b415d9619c23398ab8326d6385ee80f98fef0caad7169` | 59 |

## Observed configuration fields

Fields below are extracted directly from model configs. Missing data means **not observed**, not absent from the architecture.

### text — `LiquidAI/LFM3-1.7B`

Source: https://huggingface.co/LiquidAI/LFM3-1.7B/resolve/main/config.json

- `architectures`: `{"list_length": 1, "preview": ["Lfm3ForCausalLM"]}`
- `hidden_size`: `2048`
- `layer_types`: `{"list_length": 24, "preview": ["conv", "conv", "full_attention", "conv", "sliding_attention", "conv", "full_attention", "conv", "sliding_attention", "conv", "full_attention", "conv", "sliding_attention", "conv", "full_attention", "conv", "sliding_attention", "conv", "full_attention", "conv", "sliding_attention", "conv", "full_attention", "conv"]}`
- `max_position_embeddings`: `262144`
- `model_type`: `"lfm3"`
- `num_attention_heads`: `16`
- `num_hidden_layers`: `24`
- `num_key_value_heads`: `4`
- `rope_parameters.full_attention.rope_theta`: `1000000.0`
- `rope_parameters.full_attention.rope_type`: `"default"`
- `rope_parameters.sliding_attention.rope_theta`: `10000`
- `rope_parameters.sliding_attention.rope_type`: `"default"`
- `sliding_window`: `256`
- `vocab_size`: `128000`

### vision — `LiquidAI/LFM3-VL-2B`

Source: https://huggingface.co/LiquidAI/LFM3-VL-2B/resolve/main/config.json

- `architectures`: `{"list_length": 1, "preview": ["Lfm3VlForConditionalGeneration"]}`
- `model_type`: `"lfm3_vl"`
- `projector_hidden_size`: `4096`
- `text_config.hidden_size`: `2048`
- `text_config.layer_types`: `{"list_length": 24, "preview": ["conv", "conv", "full_attention", "conv", "sliding_attention", "conv", "full_attention", "conv", "sliding_attention", "conv", "full_attention", "conv", "sliding_attention", "conv", "full_attention", "conv", "sliding_attention", "conv", "full_attention", "conv", "sliding_attention", "conv", "full_attention", "conv"]}`
- `text_config.max_position_embeddings`: `128000`
- `text_config.model_type`: `"lfm3"`
- `text_config.num_attention_heads`: `16`
- `text_config.num_hidden_layers`: `24`
- `text_config.num_key_value_heads`: `4`
- `text_config.rope_parameters.full_attention.rope_theta`: `1000000.0`
- `text_config.rope_parameters.full_attention.rope_type`: `"default"`
- `text_config.rope_parameters.sliding_attention.rope_theta`: `10000`
- `text_config.rope_parameters.sliding_attention.rope_type`: `"default"`
- `text_config.sliding_window`: `256`
- `text_config.vocab_size`: `128000`
- `vision_config.conv_kernel_size`: `3`
- `vision_config.hidden_size`: `1024`
- `vision_config.layer_types`: `{"list_length": 14, "preview": ["conv", "conv", "full_attention", "conv", "full_attention", "conv", "full_attention", "conv", "full_attention", "conv", "full_attention", "conv", "full_attention", "conv"]}`
- `vision_config.model_type`: `"lfm3_vl_vision"`
- `vision_config.num_attention_heads`: `16`
- `vision_config.num_hidden_layers`: `14`
- `vision_config.num_key_value_heads`: `8`
- `vision_config.patch_size`: `16`
- `vision_config.rope_parameters.rope_theta`: `1000000.0`
- `vision_config.rope_parameters.rope_type`: `"axial"`
- `vision_config.temporal_patch_size`: `2`
- `vision_end_token_id`: `125010`
- `vision_start_token_id`: `125009`

### audio — `LiquidAI/LFM3-Audio-2B`

Source: https://huggingface.co/LiquidAI/LFM3-Audio-2B/resolve/main/config.json

- `architectures`: `{"list_length": 1, "preview": ["Lfm3AudioForConditionalGeneration"]}`
- `model_type`: `"lfm3_audio"`
- `audio_vocab_size`: `2017`
- `interleaved_n_audio`: `12`
- `tokenizer.revision`: `"39badc470af6cdf6f6a6fbb4d6d1c4d1929b5b96"`
- `encoder.sliding_window`: `32`
- `encoder.lfm.architectures`: `null`
- `encoder.lfm.vocab_size`: `2`
- `encoder.lfm.hidden_size`: `768`
- `encoder.lfm.num_hidden_layers`: `17`
- `encoder.lfm.num_attention_heads`: `8`
- `encoder.lfm.num_key_value_heads`: `4`
- `encoder.lfm.max_position_embeddings`: `128000`
- `encoder.lfm.rope_parameters.rope_theta`: `1000000.0`
- `encoder.lfm.rope_parameters.rope_type`: `"default"`
- `encoder.lfm.layer_types`: `{"list_length": 17, "preview": ["conv", "conv", "full_attention", "conv", "conv", "full_attention", "conv", "conv", "full_attention", "conv", "conv", "full_attention", "conv", "conv", "full_attention", "full_attention", "full_attention"]}`
- `encoder.lfm.model_type`: `"lfm2"`
- `depthformer.architectures`: `null`
- `depthformer.vocab_size`: `1`
- `depthformer.hidden_size`: `1024`
- `depthformer.num_hidden_layers`: `3`
- `depthformer.num_attention_heads`: `32`
- `depthformer.num_key_value_heads`: `8`
- `depthformer.max_position_embeddings`: `12`
- `depthformer.rope_parameters.full_attention.rope_type`: `"default"`
- `depthformer.rope_parameters.full_attention.rope_theta`: `1000000.0`
- `depthformer.layer_types`: `{"list_length": 3, "preview": ["full_attention", "full_attention", "full_attention"]}`
- `depthformer.sliding_window`: `256`
- `depthformer.model_type`: `"lfm3"`
- `lfm.architectures`: `{"list_length": 1, "preview": ["Lfm3ForCausalLM"]}`
- `lfm.vocab_size`: `128000`
- `lfm.hidden_size`: `2048`
- `lfm.num_hidden_layers`: `24`
- `lfm.num_attention_heads`: `16`
- `lfm.num_key_value_heads`: `4`
- `lfm.max_position_embeddings`: `128000`
- `lfm.rope_parameters.full_attention.rope_theta`: `1000000.0`
- `lfm.rope_parameters.full_attention.rope_type`: `"default"`
- `lfm.rope_parameters.sliding_attention.rope_theta`: `10000`
- `lfm.rope_parameters.sliding_attention.rope_type`: `"default"`
- `lfm.layer_types`: `{"list_length": 24, "preview": ["conv", "conv", "full_attention", "conv", "sliding_attention", "conv", "full_attention", "conv", "sliding_attention", "conv", "full_attention", "conv", "sliding_attention", "conv", "full_attention", "conv", "sliding_attention", "conv", "full_attention", "conv", "sliding_attention", "conv", "full_attention", "conv"]}`
- `lfm.sliding_window`: `256`
- `lfm.model_type`: `"lfm3"`

### omni — `LiquidAI/LFM3-Omni-2B`

Source: https://huggingface.co/LiquidAI/LFM3-Omni-2B/resolve/main/config.json

- `architectures`: `{"list_length": 1, "preview": ["Lfm3OmniForConditionalGeneration"]}`
- `audio_encoder_config.hidden_size`: `768`
- `audio_encoder_config.model_type`: `"lfm3_omni_encoder"`
- `audio_encoder_config.sliding_window`: `32`
- `audio_encoder_config.text_config.architectures`: `null`
- `audio_encoder_config.text_config.hidden_size`: `768`
- `audio_encoder_config.text_config.layer_types`: `{"list_length": 17, "preview": ["conv", "conv", "full_attention", "conv", "conv", "full_attention", "conv", "conv", "full_attention", "conv", "conv", "full_attention", "conv", "conv", "full_attention", "full_attention", "full_attention"]}`
- `audio_encoder_config.text_config.max_position_embeddings`: `128000`
- `audio_encoder_config.text_config.model_type`: `"lfm2"`
- `audio_encoder_config.text_config.num_attention_heads`: `8`
- `audio_encoder_config.text_config.num_hidden_layers`: `17`
- `audio_encoder_config.text_config.num_key_value_heads`: `4`
- `audio_encoder_config.text_config.rope_parameters.rope_theta`: `1000000.0`
- `audio_encoder_config.text_config.rope_parameters.rope_type`: `"default"`
- `audio_encoder_config.text_config.vocab_size`: `2`
- `audio_eos_code`: `2016`
- `audio_loss_weight`: `1.0`
- `audio_out_token_id`: `125032`
- `audio_start_token_id`: `125012`
- `audio_token_id`: `125031`
- `depth_config.hidden_size`: `1024`
- `depth_config.layer_types`: `{"list_length": 3, "preview": ["full_attention", "full_attention", "full_attention"]}`
- `depth_config.max_position_embeddings`: `12`
- `depth_config.model_type`: `"lfm3"`
- `depth_config.num_attention_heads`: `32`
- `depth_config.num_hidden_layers`: `3`
- `depth_config.num_key_value_heads`: `8`
- `depth_config.rope_parameters.full_attention.rope_theta`: `1000000.0`
- `depth_config.rope_parameters.full_attention.rope_type`: `"default"`
- `depth_config.sliding_window`: `256`
- `depth_config.vocab_size`: `1`
- `interleaved_n_audio`: `12`
- `model_type`: `"lfm3_omni"`
- `projector_hidden_size`: `4096`
- `text_config.hidden_size`: `2048`
- `text_config.layer_types`: `{"list_length": 24, "preview": ["conv", "conv", "full_attention", "conv", "sliding_attention", "conv", "full_attention", "conv", "sliding_attention", "conv", "full_attention", "conv", "sliding_attention", "conv", "full_attention", "conv", "sliding_attention", "conv", "full_attention", "conv", "sliding_attention", "conv", "full_attention", "conv"]}`
- `text_config.max_position_embeddings`: `128000`
- `text_config.model_type`: `"lfm3"`
- `text_config.num_attention_heads`: `16`
- `text_config.num_hidden_layers`: `24`
- `text_config.num_key_value_heads`: `4`
- `text_config.rope_parameters.full_attention.rope_theta`: `1000000.0`
- `text_config.rope_parameters.full_attention.rope_type`: `"default"`
- `text_config.rope_parameters.sliding_attention.rope_theta`: `10000`
- `text_config.rope_parameters.sliding_attention.rope_type`: `"default"`
- `text_config.sliding_window`: `256`
- `text_config.vocab_size`: `128000`
- `vision_config.conv_kernel_size`: `3`
- `vision_config.hidden_size`: `1024`
- `vision_config.layer_types`: `{"list_length": 14, "preview": ["conv", "conv", "full_attention", "conv", "full_attention", "conv", "full_attention", "conv", "full_attention", "conv", "full_attention", "conv", "full_attention", "conv"]}`
- `vision_config.model_type`: `"lfm3_vl_vision"`
- `vision_config.num_attention_heads`: `16`
- `vision_config.num_hidden_layers`: `14`
- `vision_config.num_key_value_heads`: `8`
- `vision_config.patch_size`: `16`
- `vision_config.rope_parameters.rope_theta`: `1000000.0`
- `vision_config.rope_parameters.rope_type`: `"axial"`
- `vision_config.temporal_patch_size`: `2`

### d1 — `LiquidAI/d1-2B`

Source: https://huggingface.co/LiquidAI/d1-2B/resolve/main/config.json

- `architectures`: `{"list_length": 1, "preview": ["D1Model"]}`
- `model_type`: `"lfm3_vl"`
- `projector_hidden_size`: `4096`
- `text_config.hidden_size`: `2048`
- `text_config.layer_types`: `{"list_length": 24, "preview": ["conv", "conv", "full_attention", "conv", "sliding_attention", "conv", "full_attention", "conv", "sliding_attention", "conv", "full_attention", "conv", "sliding_attention", "conv", "full_attention", "conv", "sliding_attention", "conv", "full_attention", "conv", "sliding_attention", "conv", "full_attention", "conv"]}`
- `text_config.max_position_embeddings`: `128000`
- `text_config.model_type`: `"lfm3"`
- `text_config.num_attention_heads`: `16`
- `text_config.num_hidden_layers`: `24`
- `text_config.num_key_value_heads`: `4`
- `text_config.rope_parameters.full_attention.rope_theta`: `1000000.0`
- `text_config.rope_parameters.full_attention.rope_type`: `"default"`
- `text_config.rope_parameters.sliding_attention.rope_theta`: `10000`
- `text_config.rope_parameters.sliding_attention.rope_type`: `"default"`
- `text_config.sliding_window`: `256`
- `text_config.vocab_size`: `128000`
- `vision_config.conv_kernel_size`: `3`
- `vision_config.hidden_size`: `1024`
- `vision_config.layer_types`: `{"list_length": 14, "preview": ["conv", "conv", "full_attention", "conv", "full_attention", "conv", "full_attention", "conv", "full_attention", "conv", "full_attention", "conv", "full_attention", "conv"]}`
- `vision_config.model_type`: `"lfm3_vl_vision"`
- `vision_config.num_attention_heads`: `16`
- `vision_config.num_hidden_layers`: `14`
- `vision_config.num_key_value_heads`: `8`
- `vision_config.patch_size`: `16`
- `vision_config.rope_parameters.rope_theta`: `1000000.0`
- `vision_config.rope_parameters.rope_type`: `"axial"`
- `vision_config.temporal_patch_size`: `2`
- `vision_end_token_id`: `125010`
- `vision_start_token_id`: `125009`
- `d1_vision_max_pixels`: `1638400`

### d1_omni — `LiquidAI/d1-Omni-2B`

Source: https://huggingface.co/LiquidAI/d1-Omni-2B/resolve/main/config.json

- `architectures`: `{"list_length": 1, "preview": ["D1Model"]}`
- `audio_encoder_config.hidden_size`: `768`
- `audio_encoder_config.model_type`: `"lfm3_omni_encoder"`
- `audio_encoder_config.sliding_window`: `32`
- `audio_encoder_config.text_config.architectures`: `null`
- `audio_encoder_config.text_config.hidden_size`: `768`
- `audio_encoder_config.text_config.layer_types`: `{"list_length": 17, "preview": ["conv", "conv", "full_attention", "conv", "conv", "full_attention", "conv", "conv", "full_attention", "conv", "conv", "full_attention", "conv", "conv", "full_attention", "full_attention", "full_attention"]}`
- `audio_encoder_config.text_config.max_position_embeddings`: `128000`
- `audio_encoder_config.text_config.model_type`: `"lfm2"`
- `audio_encoder_config.text_config.num_attention_heads`: `8`
- `audio_encoder_config.text_config.num_hidden_layers`: `17`
- `audio_encoder_config.text_config.num_key_value_heads`: `4`
- `audio_encoder_config.text_config.rope_parameters.rope_theta`: `1000000.0`
- `audio_encoder_config.text_config.rope_parameters.rope_type`: `"default"`
- `audio_encoder_config.text_config.vocab_size`: `2`
- `audio_eos_code`: `2016`
- `audio_loss_weight`: `1.0`
- `audio_out_token_id`: `125032`
- `audio_start_token_id`: `125012`
- `audio_token_id`: `125031`
- `depth_config.hidden_size`: `1024`
- `depth_config.layer_types`: `{"list_length": 3, "preview": ["full_attention", "full_attention", "full_attention"]}`
- `depth_config.max_position_embeddings`: `12`
- `depth_config.model_type`: `"lfm3"`
- `depth_config.num_attention_heads`: `32`
- `depth_config.num_hidden_layers`: `3`
- `depth_config.num_key_value_heads`: `8`
- `depth_config.rope_parameters.full_attention.rope_theta`: `1000000.0`
- `depth_config.rope_parameters.full_attention.rope_type`: `"default"`
- `depth_config.sliding_window`: `256`
- `depth_config.vocab_size`: `1`
- `interleaved_n_audio`: `12`
- `model_type`: `"lfm3_omni"`
- `projector_hidden_size`: `4096`
- `text_config.hidden_size`: `2048`
- `text_config.layer_types`: `{"list_length": 24, "preview": ["conv", "conv", "full_attention", "conv", "sliding_attention", "conv", "full_attention", "conv", "sliding_attention", "conv", "full_attention", "conv", "sliding_attention", "conv", "full_attention", "conv", "sliding_attention", "conv", "full_attention", "conv", "sliding_attention", "conv", "full_attention", "conv"]}`
- `text_config.max_position_embeddings`: `128000`
- `text_config.model_type`: `"lfm3"`
- `text_config.num_attention_heads`: `16`
- `text_config.num_hidden_layers`: `24`
- `text_config.num_key_value_heads`: `4`
- `text_config.rope_parameters.full_attention.rope_theta`: `1000000.0`
- `text_config.rope_parameters.full_attention.rope_type`: `"default"`
- `text_config.rope_parameters.sliding_attention.rope_theta`: `10000`
- `text_config.rope_parameters.sliding_attention.rope_type`: `"default"`
- `text_config.sliding_window`: `256`
- `text_config.vocab_size`: `128000`
- `vision_config.conv_kernel_size`: `3`
- `vision_config.hidden_size`: `1024`
- `vision_config.layer_types`: `{"list_length": 14, "preview": ["conv", "conv", "full_attention", "conv", "full_attention", "conv", "full_attention", "conv", "full_attention", "conv", "full_attention", "conv", "full_attention", "conv"]}`
- `vision_config.model_type`: `"lfm3_vl_vision"`
- `vision_config.num_attention_heads`: `16`
- `vision_config.num_hidden_layers`: `14`
- `vision_config.num_key_value_heads`: `8`
- `vision_config.patch_size`: `16`
- `vision_config.rope_parameters.rope_theta`: `1000000.0`
- `vision_config.rope_parameters.rope_type`: `"axial"`
- `vision_config.temporal_patch_size`: `2`
- `d1_vision_max_pixels`: `1638400`

## Evidence policy

- OFFICIAL: manufacturer/model-card documentation
- OBSERVED: fields in archived `config.json`, runtime tensor metadata, or source implementation
- INFERRED: hypotheses requiring a validation experiment

Do not treat layer-count summaries as execution order unless verified in model source/config.
