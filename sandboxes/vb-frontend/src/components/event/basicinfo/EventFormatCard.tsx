import React, { useState } from 'react';
import EditableCard from '../../common/EditableCard';
import Input from '../../common/Input';
import Select from '../../common/Select';
import SectionTitle from '../../common/SectionTitle';
import { EventComplete, EventFormat, TeamScoringMethod, TeamHandicapMethod } from '../../../types/event';

interface EventFormatCardProps {
  eventComplete: EventComplete;
  isAuthorizedToEdit: boolean;
  onSave: (data: any) => Promise<any>;
  onOpenFinalPayouts?: () => void;
  /** Saved round/advancement structure (library template or live round summary). */
  appliedStructureFormatLabel?: string | null;
}

const EventFormatCard: React.FC<EventFormatCardProps> = ({
  eventComplete,
  isAuthorizedToEdit,
  onSave,
  onOpenFinalPayouts,
  appliedStructureFormatLabel,
}) => {

  const EditContent: React.FC<{ setSaveData: (data: any) => void; initialFormData: any }> = ({ setSaveData, initialFormData }) => {

    const [formData, setFormData] = useState(initialFormData);

    

    React.useEffect(() => {

      const saveData: any = {};

      const switchingToTeams =
        formData.event_format === EventFormat.TEAMS &&
        eventComplete.event_format !== EventFormat.TEAMS;

      if (formData.event_format !== eventComplete.event_format) {

        saveData.event_format = formData.event_format;

      }

      if (formData.event_format === EventFormat.TEAMS) {

        if (
          switchingToTeams ||
          formData.team_size !== (eventComplete.team_size || '')
        ) {
          saveData.team_size = formData.team_size ? parseInt(formData.team_size as string, 10) : null;
        }

        if (
          switchingToTeams ||
          formData.team_scoring_method !== (eventComplete.team_scoring_method || '')
        ) {
          saveData.team_scoring_method = formData.team_scoring_method || null;
        }

        // DYLG moved to per-round config; clear legacy event fields on save.
        if (eventComplete.dylg_enabled || eventComplete.dylg_scope) {
          saveData.dylg_enabled = false;
          saveData.dylg_scope = null;
        }

        if (
          switchingToTeams ||
          formData.team_handicap_method !== (eventComplete.team_handicap_method || '')
        ) {
          saveData.team_handicap_method = formData.team_handicap_method || null;
        }

        if (
          switchingToTeams ||
          formData.team_handicap_percentage !== (eventComplete.team_handicap_percentage || '')
        ) {
          saveData.team_handicap_percentage = formData.team_handicap_percentage
            ? parseFloat(formData.team_handicap_percentage as string)
            : null;
        }

        if (
          switchingToTeams ||
          formData.team_handicap_base !== (eventComplete.team_handicap_base || '')
        ) {
          saveData.team_handicap_base = formData.team_handicap_base
            ? parseInt(formData.team_handicap_base as string, 10)
            : null;
        }

        if (
          switchingToTeams ||
          formData.allow_individual_reentries !== eventComplete.allow_individual_reentries
        ) {
          saveData.allow_individual_reentries = formData.allow_individual_reentries;
        }

        if (
          switchingToTeams ||
          formData.allow_team_reentries !== eventComplete.allow_team_reentries
        ) {
          saveData.allow_team_reentries = formData.allow_team_reentries;
        }

      } else {

        saveData.team_size = null;

        saveData.team_scoring_method = null;

        saveData.dylg_enabled = false;

        saveData.dylg_scope = null;

        saveData.team_handicap_method = null;

        saveData.team_handicap_percentage = null;

        saveData.team_handicap_base = null;

        saveData.allow_individual_reentries = true;

        saveData.allow_team_reentries = false;

      }

      if (formData.event_format === EventFormat.SINGLES) {
        const switchingToSingles =
          formData.event_format === EventFormat.SINGLES &&
          eventComplete.event_format !== EventFormat.SINGLES;

        if (
          switchingToSingles ||
          formData.allows_reentry !== eventComplete.allows_reentry
        ) {
          saveData.allows_reentry = formData.allows_reentry;
        }

        if (
          switchingToSingles ||
          formData.max_reentries !== (eventComplete.max_reentries?.toString() || '')
        ) {
          saveData.max_reentries = formData.max_reentries
            ? parseInt(String(formData.max_reentries), 10)
            : null;
        }

        if (
          switchingToSingles ||
          formData.reentry_fee !== (eventComplete.reentry_fee?.toString() || '')
        ) {
          saveData.reentry_fee = formData.reentry_fee
            ? parseFloat(String(formData.reentry_fee))
            : null;
        }

        if (!formData.allows_reentry) {
          saveData.max_reentries = null;
          saveData.reentry_fee = null;
        }
      }

      setSaveData(saveData);

    }, [formData, setSaveData, eventComplete]);

    

    const handleInputChange = (field: string, value: any) => {

      setFormData((prev: Record<string, any>) => ({ ...prev, [field]: value }));

    };

    

    return (

      <div className="space-y-4">

        <div>
          <label className="block text-sm font-medium text-text mb-1">
            Event Format
          </label>
          <Select
            value={formData.event_format}
            onChange={(value) => handleInputChange('event_format', value)}
            options={[
              { value: EventFormat.SINGLES, label: 'Singles Event' },
              { value: EventFormat.TEAMS, label: 'Team Event' }
            ]}
          />
        </div>

        {formData.event_format === EventFormat.TEAMS && (
                             <div className="space-y-4 border-t pt-4">
                 <SectionTitle size="small">Team Configuration</SectionTitle>
                
                <div>
                  <Input
                    label="Team Size"
                    type="number"
                    min={2}
                    max={10}
                    value={formData.team_size}
                    onChange={(e) => handleInputChange('team_size', e.target.value)}
                    placeholder="e.g., 4"
                    fullWidth
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Team Scoring Method
                  </label>
                  <Select
                    value={formData.team_scoring_method}
                    onChange={(value) => handleInputChange('team_scoring_method', value)}
                                         options={[
                       { value: '', label: 'Select scoring method...' },
                       { value: TeamScoringMethod.SUM_ALL, label: 'Sum All' },
                       { value: TeamScoringMethod.SUM_BEST_N, label: 'Sum Best N' }
                     ]}
                  />
                  <p className="mt-1 text-xs text-text-muted">
                    How member scores roll up to the team. Baker vs standard games are set per
                    round on Format Editor, not here.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Team Handicap Method
                  </label>
                  {(eventComplete.handicap_percentage ?? 0) === 0 ? (
                    <p className="text-sm text-text-muted">
                      Event is scratch — team handicap does not apply. Change event scoring under Handicap Information if needed.
                    </p>
                  ) : (
                  <Select
                    value={formData.team_handicap_method}
                    onChange={(value) => handleInputChange('team_handicap_method', value)}
                                         options={[
                       { value: '', label: 'Select handicap method...' },
                       { value: TeamHandicapMethod.PERCENTAGE_OF_BASE, label: 'Percentage of Base' },
                       { value: TeamHandicapMethod.SUM_INDIVIDUAL, label: 'Sum of Individual' }
                     ]}
                  />
                  )}
                </div>

                {(eventComplete.handicap_percentage ?? 0) > 0 && formData.team_handicap_method === TeamHandicapMethod.PERCENTAGE_OF_BASE && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Input
                        label="Team Handicap Percentage"
                        type="number"
                        min={0}
                        max={100}
                        value={formData.team_handicap_percentage}
                        onChange={(e) => handleInputChange('team_handicap_percentage', e.target.value)}
                        placeholder="90"
                        fullWidth
                      />
                    </div>
                    <div>
                      <Input
                        label="Team Handicap Base"
                        type="number"
                        min={400}
                        max={1200}
                        value={formData.team_handicap_base}
                        onChange={(e) => handleInputChange('team_handicap_base', e.target.value)}
                        placeholder="800"
                        fullWidth
                      />
                    </div>
                  </div>
                )}

                                 <div className="border-t pt-4">
                   <SectionTitle size="small" className="mb-3">Team Re-entry Options</SectionTitle>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.allow_individual_reentries}
                        onChange={(e) => handleInputChange('allow_individual_reentries', e.target.checked)}
                        className="mr-2 rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-text">Allow Individual Re-entries</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.allow_team_reentries}
                        onChange={(e) => handleInputChange('allow_team_reentries', e.target.checked)}
                        className="mr-2 rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-text">Allow Team Re-entries</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {formData.event_format === EventFormat.SINGLES && (
              <div className="space-y-4 border-t pt-4">
                <div className="text-sm text-text-muted">
                  Individual competition format - each bowler competes independently.
                </div>
                <div className="border-t pt-4">
                  <SectionTitle size="small" className="mb-3">Re-entry</SectionTitle>
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.allows_reentry}
                          onChange={(e) =>
                            handleInputChange('allows_reentry', e.target.checked)
                          }
                          className="mr-2 rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="text-sm font-medium text-text">
                          Allow re-entry
                        </span>
                      </label>
                      <p className="text-sm text-text-muted mt-1">
                        Allow bowlers to re-enter this event after completing it
                      </p>
                    </div>
                    {formData.allows_reentry && (
                      <>
                        <div>
                          <Input
                            label="Maximum Re-entries"
                            type="number"
                            min={1}
                            max={10}
                            value={formData.max_reentries}
                            onChange={(e) =>
                              handleInputChange('max_reentries', e.target.value)
                            }
                            placeholder="Leave blank for unlimited"
                            fullWidth
                          />
                          <p className="text-sm text-text-muted mt-1">
                            How many times can a bowler re-enter? (blank = unlimited)
                          </p>
                        </div>
                        <div>
                          <Input
                            label="Re-entry Fee ($)"
                            type="number"
                            min={0}
                            step={0.01}
                            value={formData.reentry_fee}
                            onChange={(e) =>
                              handleInputChange('reentry_fee', e.target.value)
                            }
                            placeholder="0.00"
                            fullWidth
                          />
                          <p className="text-sm text-text-muted mt-1">
                            Fee charged for each re-entry (blank = same as entry fee)
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      };

  const initialFormData = {

    event_format: eventComplete.event_format || EventFormat.SINGLES,

    team_size: eventComplete.team_size || '',

    team_scoring_method: eventComplete.team_scoring_method || '',

    team_handicap_method: eventComplete.team_handicap_method || '',

    team_handicap_percentage: eventComplete.team_handicap_percentage || '',

    team_handicap_base: eventComplete.team_handicap_base || '',

    allow_individual_reentries: eventComplete.allow_individual_reentries ?? true,

    allow_team_reentries: eventComplete.allow_team_reentries ?? false,

    allows_reentry: eventComplete.allows_reentry || false,

    max_reentries: eventComplete.max_reentries?.toString() || '',

    reentry_fee: eventComplete.reentry_fee?.toString() || ''

  };

  

  return (

    <EditableCard 

      title="Event Format & Configuration"

      canEdit={isAuthorizedToEdit}

      onSave={onSave}

      editContent={(setSaveData) => <EditContent setSaveData={setSaveData} initialFormData={initialFormData} />}

    >

      <div className="space-y-4 text-text">
        <div>
          <SectionTitle size="small" className="mb-1">
            Event Format
          </SectionTitle>
          <div className="text-lg font-semibold text-text capitalize">
            {eventComplete.event_format === 'teams' ? 'Team Event' : 'Singles Event'}
          </div>
        </div>

        {appliedStructureFormatLabel != null && appliedStructureFormatLabel !== '' && (
          <div>
            <SectionTitle size="small" className="mb-1">
              Saved event format
            </SectionTitle>
            <div className="text-base font-medium text-text">{appliedStructureFormatLabel}</div>
            <p className="text-xs text-text-muted mt-1">
              Round structure and advancement from your format library or custom setup.
            </p>
          </div>
        )}

        {/* Team Configuration - only show for team events */}
        {eventComplete.event_format === 'teams' && (
                     <div className="border-t pt-3 space-y-3">
             <SectionTitle size="small" className="mb-2">Team Configuration</SectionTitle>
            
            {eventComplete.team_size && (
              <div className="flex justify-between">
                <span>Team Size:</span>
                <span className="font-medium">{eventComplete.team_size} bowlers</span>
              </div>
            )}

            {eventComplete.team_scoring_method && (
              <div className="flex justify-between">
                <span>Team Aggregate:</span>
                <span className="font-medium capitalize">{eventComplete.team_scoring_method.replace(/_/g, ' ')}</span>
              </div>
            )}

            <div className="text-sm text-text-muted">
              Game style (Standard / Baker) is set per round on the{' '}
              <span className="font-medium text-text">Format Editor</span> tab (when the event
              includes round robin, bracket, stepladder, or pods).
            </div>

            {(eventComplete.handicap_percentage ?? 0) === 0 ? (
              <div className="flex justify-between">
                <span>Event Scoring:</span>
                <span className="font-medium">Scratch</span>
              </div>
            ) : (
              eventComplete.team_handicap_method && (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Team Handicap Method:</span>
                  <span className="font-medium capitalize">{eventComplete.team_handicap_method.replace(/_/g, ' ')}</span>
                </div>
                {eventComplete.team_handicap_method === 'percentage_of_base' && eventComplete.team_handicap_percentage && eventComplete.team_handicap_base && (
                  <div className="text-sm text-text-muted ml-4">
                    {eventComplete.team_handicap_percentage}% of {eventComplete.team_handicap_base}
                  </div>
                )}
              </div>
              )
            )}

            {/* Team Re-entry Information */}
                         <div className="border-t pt-2 mt-2">
               <SectionTitle size="small" className="mb-1">Team Re-entry Options</SectionTitle>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Individual Re-entries:</span>
                  <span className="font-medium">{eventComplete.allow_individual_reentries ? 'Allowed' : 'Not Allowed'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Team Re-entries:</span>
                  <span className="font-medium">{eventComplete.allow_team_reentries ? 'Allowed' : 'Not Allowed'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {eventComplete.event_format === 'singles' && (
          <div className="border-t pt-3 space-y-3">
            <div className="text-sm text-text-muted">
              Individual competition format - each bowler competes independently.
            </div>
            <div className="border-t pt-2 mt-2">
              <SectionTitle size="small" className="mb-1">Re-entry</SectionTitle>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Allow re-entry:</span>
                  <span className="font-medium">
                    {eventComplete.allows_reentry ? 'Yes' : 'No'}
                  </span>
                </div>
                {eventComplete.allows_reentry && (
                  <>
                    {eventComplete.max_reentries != null && (
                      <div className="flex justify-between">
                        <span>Max re-entries:</span>
                        <span className="font-medium">{eventComplete.max_reentries}</span>
                      </div>
                    )}
                    {eventComplete.reentry_fee != null && (
                      <div className="flex justify-between">
                        <span>Re-entry fee:</span>
                        <span className="font-medium">
                          ${eventComplete.reentry_fee.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        {eventComplete.final_nodes_completed &&
          eventComplete.prize_settings_valid !== false &&
          onOpenFinalPayouts && (
          <div className="border-t pt-3 mt-3 flex justify-end">
            <button
              type="button"
              onClick={onOpenFinalPayouts}
              className="px-3 py-2 rounded-md border border-border text-sm text-text hover:bg-surface-light"
            >
              Final Payouts
            </button>
          </div>
        )}
        {eventComplete.final_nodes_completed &&
          eventComplete.prize_settings_valid === false &&
          eventComplete.prize_validation_error && (
          <p className="border-t pt-3 mt-3 text-sm text-text-muted">
            Final payout amounts are unavailable until prize settings are fixed:{' '}
            {eventComplete.prize_validation_error}
          </p>
        )}
      </div>
    </EditableCard>
  );
};

export default EventFormatCard; 