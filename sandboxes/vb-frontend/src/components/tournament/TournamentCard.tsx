import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardActionArea, 
  Typography, 
  Box, 
  Chip, 
  Stack,
  Divider
} from '@mui/material';
import DateRangeIcon from '@mui/icons-material/DateRange';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import PaidIcon from '@mui/icons-material/Paid';
import StraightenIcon from '@mui/icons-material/Straighten';
import ViewListIcon from '@mui/icons-material/ViewList';
import { TournamentSearch } from '../../types/tournament';
import { formatDateNaive } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { useRoleAwareNavigation } from '../../utils/roleBasedRouting';

// Helper function to determine chip color based on tournament status
const getStatusColor = (status: string): 'success' | 'warning' | 'default' => {
  switch (status) {
    case 'upcoming':
      return 'success';
    case 'ongoing':
      return 'warning';
    default:
      return 'default';
  }
};

interface TournamentCardProps {
  tournament: TournamentSearch;
  showDistance?: boolean;
}

const TournamentCard: React.FC<TournamentCardProps> = ({ tournament, showDistance = false }) => {
  const { user } = useAuth();
  const roleAwareNav = useRoleAwareNavigation(user);
  const {
    id,
    name,
    start_date,
    end_date,
    bowling_center_name,
    city,
    state,
    current_entries,
    status,
    distance,
    lanes_reserved
  } = tournament;

  // Format dates
  const formattedStartDate = formatDateNaive(start_date);
  const formattedEndDate = formatDateNaive(end_date);
  const isMultiDay = formattedStartDate !== formattedEndDate;
  const dateDisplay = isMultiDay 
    ? `${formattedStartDate} - ${formattedEndDate}` 
    : formattedStartDate;

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea component={Link} to={roleAwareNav.getTournamentPath(id)} sx={{ flexGrow: 1 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h6" component="h3" gutterBottom noWrap>
              {name}
            </Typography>
            <Chip 
              label={status.charAt(0).toUpperCase() + status.slice(1)} 
              color={getStatusColor(status)}
              size="small"
            />
          </Box>
          
          <Stack spacing={1.5} sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <DateRangeIcon sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" />
              <Typography variant="body2">{dateDisplay}</Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <LocationOnIcon sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" />
              <Typography variant="body2" noWrap>
                {bowling_center_name}, {city}, {state}
              </Typography>
            </Box>

            {showDistance && distance !== undefined && distance !== null && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <StraightenIcon sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" />
                <Typography variant="body2">
                  {distance.toFixed(1)} miles away
                </Typography>
              </Box>
            )}
          </Stack>

          <Divider sx={{ my: 1.5 }} />

          <Stack 
            direction="row" 
            spacing={2} 
            sx={{ 
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              '& > div': { minWidth: '45%' }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PeopleIcon sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" />
              <Typography variant="body2">
                {current_entries} Entries
              </Typography>
            </Box>

            {lanes_reserved && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ViewListIcon sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" />
                <Typography variant="body2">
                  {lanes_reserved} Lanes
                </Typography>
              </Box>
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default TournamentCard;
