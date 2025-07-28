const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const configLoader = require('./configLoader');

function buildTicketModal(categoryId) {
  const category = configLoader.getCategory(categoryId);
  if (!category) {
    throw new Error(`Category ${categoryId} not found`);
  }

  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal_${categoryId}`)
    .setTitle(configLoader.formatMessage('modal.title', {
      emoji: category.emoji,
      category: category.name
    }));

  const components = [];

  category.questions.forEach((question, index) => {
    const input = new TextInputBuilder()
      .setCustomId(question.id)
      .setLabel(question.label)
      .setPlaceholder(question.placeholder)
      .setRequired(question.required || false);

    // Set style based on question type
    if (question.style === 1) {
      input.setStyle(TextInputStyle.Short);
    } else if (question.style === 2) {
      input.setStyle(TextInputStyle.Paragraph);
    }

    // Set max length if specified
    if (question.maxLength) {
      input.setMaxLength(question.maxLength);
    }

    // Set min length for required fields
    if (question.required) {
      input.setMinLength(1);
    }

    const actionRow = new ActionRowBuilder().addComponents(input);
    components.push(actionRow);
  });

  modal.addComponents(components);
  return modal;
}

module.exports = { buildTicketModal }; 